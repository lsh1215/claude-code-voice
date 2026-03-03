import fs from 'fs';
import path from 'path';
import { captureAudio } from '../stt/audio-capture.js';
import { captureAudioWithVAD } from '../vad/silence-vad.js';
import { transcribe, isWhisperAvailable } from '../stt/whisper-engine.js';
import {
  isWhisperServerAvailable,
  readServerInfo,
  isServerAlive,
  startWhisperServer,
  transcribeViaServer,
} from '../stt/whisper-server-manager.js';
import { detectBinaries } from '../utils/platform.js';
import { loadConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export async function handleVoice(): Promise<void> {
  const config = loadConfig();
  const binaries = detectBinaries();

  // 1. Check prerequisites
  if (config.sttEngine === 'whisper-server') {
    if (!isWhisperServerAvailable()) {
      process.stdout.write('❌ whisper-server not found.\nInstall: brew install whisper-cpp\n');
      process.exit(1);
    }
  } else {
    if (!isWhisperAvailable()) {
      process.stdout.write('❌ whisper-cli not found.\nInstall: brew install whisper-cpp\n');
      process.exit(1);
    }
  }

  if (!binaries.ffmpeg) {
    process.stdout.write('❌ ffmpeg not found.\nInstall: brew install ffmpeg\n');
    process.exit(1);
  }

  if (!fs.existsSync(config.modelPath)) {
    process.stdout.write(`❌ Whisper model not found: ${config.modelPath}\n`);
    const modelFile = path.basename(config.modelPath);
    process.stdout.write(`Download: curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${modelFile}" -o ${config.modelPath}\n`);
    process.exit(1);
  }

  // 2. Start recording
  let audioPath: string | null = null;
  try {
    if (config.silenceDurationMs > 0) {
      process.stderr.write('🎤 Listening... (auto-stops after silence)\n');
      audioPath = await captureAudioWithVAD({
        maxDurationMs: 30000,
        silenceDurationMs: config.silenceDurationMs,
        rmsThreshold: config.vadThreshold,
        sampleRate: 16000,
        audioDeviceIndex: config.audioDeviceIndex,
      });
    } else {
      process.stderr.write('🎤 Listening... (speak now, Ctrl+C to cancel)\n');
      audioPath = await captureAudio({
        durationMs: 30000,
        sampleRate: 16000,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stdout.write(`❌ Audio capture failed: ${msg}\n`);
    process.stdout.write('Make sure Terminal.app has microphone permission:\nSystem Settings → Privacy & Security → Microphone\n');
    process.exit(1);
  }

  // 3. Transcribe
  process.stderr.write('⏳ Transcribing...\n');
  let transcribedText = '';
  let transcribeError: Error | null = null;

  try {
    if (config.sttEngine === 'whisper-server') {
      let serverInfo = readServerInfo();
      if (!serverInfo || !isServerAlive(serverInfo)) {
        process.stderr.write('⚙️  Starting whisper-server (first run)...\n');
        try {
          await startWhisperServer({
            modelPath: config.modelPath,
            language: config.language,
            port: config.whisperServerPort,
          });
          serverInfo = readServerInfo()!;
        } catch (serverErr) {
          process.stderr.write(`⚠️  whisper-server failed to start: ${serverErr instanceof Error ? serverErr.message : String(serverErr)}\n`);
          if (!isWhisperAvailable()) {
            process.stderr.write('❌ whisper-cli also not available. Cannot transcribe.\n');
            return;
          }
          process.stderr.write('⚠️  Falling back to whisper-cli...\n');
          const result = transcribe(audioPath!, {
            language: config.language,
            modelPath: config.modelPath,
          });
          transcribedText = result.text;
          logger.debug(`Transcribed via whisper-cli fallback in ${result.durationMs}ms`);
        }
      }
      if (!transcribedText && serverInfo) {
        transcribedText = await transcribeViaServer(audioPath!, serverInfo.port);
      }
    } else {
      const result = transcribe(audioPath!, {
        language: config.language,
        modelPath: config.modelPath,
      });
      transcribedText = result.text;
      logger.debug(`Transcribed in ${result.durationMs}ms`);
    }
  } catch (err) {
    transcribeError = err instanceof Error ? err : new Error(String(err));
  } finally {
    if (audioPath && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
  }

  if (transcribeError) {
    process.stdout.write(`❌ Transcription failed: ${transcribeError.message}\n`);
    process.exit(1);
  }

  if (!transcribedText) {
    process.stdout.write('(no speech detected)\n');
  } else {
    process.stdout.write(transcribedText + '\n');
  }
}
