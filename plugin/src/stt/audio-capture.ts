import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

export interface AudioCaptureOptions {
  durationMs?: number;      // max duration (default 30000 = 30s)
  sampleRate?: number;      // default 16000
  outputPath?: string;      // temp file path
  audioDeviceIndex?: number; // avfoundation audio device index (default 0)
}

export async function captureAudio(options: AudioCaptureOptions = {}): Promise<string> {
  const {
    durationMs = 30000,
    sampleRate = 16000,
    outputPath = path.join(os.tmpdir(), `voice-capture-${Date.now()}.wav`),
    audioDeviceIndex = 0,
  } = options;

  const durationSec = durationMs / 1000;

  return new Promise((resolve, reject) => {
    // ffmpeg: capture from default microphone input
    // macOS: avfoundation device ":N" (mic index)
    const args = [
      '-f', 'avfoundation',
      '-i', `:${audioDeviceIndex}`,  // microphone by index
      '-t', String(durationSec),     // max duration
      '-ar', String(sampleRate),     // sample rate
      '-ac', '1',                    // mono
      '-sample_fmt', 's16',          // 16-bit PCM
      '-y',                          // overwrite
      outputPath,
    ];

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });

    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0 || (code !== null && fs.existsSync(outputPath))) {
        resolve(outputPath);
      } else {
        reject(new Error(`ffmpeg failed (code ${code}): ${stderr.slice(-200)}`));
      }
    });

    proc.on('error', reject);
  });
}

export function stopCapture(proc: ReturnType<typeof spawn>): void {
  proc.kill('SIGINT');
}
