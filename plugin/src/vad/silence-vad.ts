import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

export interface VADCaptureOptions {
  maxDurationMs?: number;       // safety timeout (default 30000)
  silenceDurationMs?: number;   // silence to trigger stop (default 1500)
  rmsThreshold?: number;        // silence RMS threshold (default 0.02)
  sampleRate?: number;          // default 16000
  outputPath?: string;
  audioDeviceIndex?: number;    // avfoundation audio device index (default 0)
}

// Compute RMS of 16-bit LE PCM buffer (values normalized 0..1)
export function computeRMS(buffer: Buffer): number {
  if (buffer.length === 0) return 0;

  const sampleCount = Math.floor(buffer.length / 2);
  if (sampleCount === 0) return 0;

  let sumSquares = 0;
  for (let i = 0; i < sampleCount; i++) {
    // Read signed 16-bit LE sample
    const sample = buffer.readInt16LE(i * 2);
    // Normalize to -1..1 range
    const normalized = sample / 32768;
    sumSquares += normalized * normalized;
  }

  return Math.sqrt(sumSquares / sampleCount);
}

// Write raw PCM to WAV file (adds RIFF/WAVE header)
export function writeWAV(pcmData: Buffer, outputPath: string, sampleRate: number): void {
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);

  // Bytes 0-3: "RIFF"
  header.write('RIFF', 0, 'ascii');
  // Bytes 4-7: 36 + dataSize
  header.writeUInt32LE(36 + dataSize, 4);
  // Bytes 8-11: "WAVE"
  header.write('WAVE', 8, 'ascii');
  // Bytes 12-15: "fmt "
  header.write('fmt ', 12, 'ascii');
  // Bytes 16-19: 16 (chunk size)
  header.writeUInt32LE(16, 16);
  // Bytes 20-21: 1 (PCM format)
  header.writeUInt16LE(1, 20);
  // Bytes 22-23: 1 (mono)
  header.writeUInt16LE(1, 22);
  // Bytes 24-27: sampleRate
  header.writeUInt32LE(sampleRate, 24);
  // Bytes 28-31: sampleRate * 2 (byte rate: sampleRate * channels * bitsPerSample/8)
  header.writeUInt32LE(sampleRate * 2, 28);
  // Bytes 32-33: 2 (block align: channels * bitsPerSample/8)
  header.writeUInt16LE(2, 32);
  // Bytes 34-35: 16 (bits per sample)
  header.writeUInt16LE(16, 34);
  // Bytes 36-39: "data"
  header.write('data', 36, 'ascii');
  // Bytes 40-43: dataSize
  header.writeUInt32LE(dataSize, 40);

  const wavBuffer = Buffer.concat([header, pcmData]);
  fs.writeFileSync(outputPath, wavBuffer);
}

// Main: stream raw PCM from ffmpeg, detect silence, auto-stop, write WAV
export async function captureAudioWithVAD(options: VADCaptureOptions = {}): Promise<string> {
  const {
    maxDurationMs = 30000,
    silenceDurationMs = 1500,
    rmsThreshold = 0.02,
    sampleRate = 16000,
    outputPath = path.join(os.tmpdir(), `voice-vad-${Date.now()}.wav`),
    audioDeviceIndex = 0,
  } = options;

  return new Promise((resolve, reject) => {
    // Stream raw s16le PCM to stdout
    const args = [
      '-f', 'avfoundation',
      '-i', `:${audioDeviceIndex}`,
      '-ar', String(sampleRate),
      '-ac', '1',
      '-f', 's16le',   // raw 16-bit PCM, no container
      'pipe:1',        // write to stdout
    ];

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    const chunks: Buffer[] = [];
    // 100ms window: sampleRate samples/sec * 0.1 sec * 2 bytes/sample
    const windowBytes = Math.floor(sampleRate * 0.1 * 2);
    let pending = Buffer.alloc(0);

    // VAD state
    let speechDetected = false;
    let silenceStartMs: number | null = null;
    let finished = false;

    // Safety timeout
    const maxTimer = setTimeout(() => {
      if (!finished) {
        finished = true;
        proc.kill('SIGINT');
      }
    }, maxDurationMs);

    proc.stdout.on('data', (chunk: Buffer) => {
      if (finished) return;

      // Accumulate into pending buffer and process in windowBytes-sized windows
      pending = Buffer.concat([pending, chunk]);
      chunks.push(chunk);

      while (pending.length >= windowBytes) {
        const window = pending.subarray(0, windowBytes);
        pending = pending.subarray(windowBytes);

        const rms = computeRMS(window);
        const now = Date.now();

        if (rms > rmsThreshold) {
          // SPEAKING state
          speechDetected = true;
          silenceStartMs = null;
        } else if (speechDetected) {
          // SILENCE state (after speech)
          if (silenceStartMs === null) {
            silenceStartMs = now;
          } else if (now - silenceStartMs >= silenceDurationMs) {
            // Silence duration exceeded → stop
            finished = true;
            clearTimeout(maxTimer);
            proc.kill('SIGINT');
          }
        }
        // WAITING state (rms low, no speech yet): do nothing
      }
    });

    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (_code: number | null) => {
      clearTimeout(maxTimer);
      if (finished === false) finished = true;

      try {
        const allPCM = Buffer.concat(chunks);
        if (allPCM.length === 0) {
          reject(new Error(`No audio captured. ffmpeg stderr: ${stderr.slice(-200)}`));
          return;
        }
        writeWAV(allPCM, outputPath, sampleRate);
        resolve(outputPath);
      } catch (err) {
        reject(err);
      }
    });

    proc.on('error', (err: Error) => {
      clearTimeout(maxTimer);
      reject(err);
    });
  });
}
