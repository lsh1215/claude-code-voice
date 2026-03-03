import fs from 'fs';
import { captureAudio } from '../stt/audio-capture.js';
import { captureAudioWithVAD } from '../vad/silence-vad.js';
import { transcribe, isWhisperAvailable } from '../stt/whisper-engine.js';
import { detectBinaries } from '../utils/platform.js';
import { loadConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export async function handleVoice(): Promise<void> {
  const config = loadConfig();
  const binaries = detectBinaries();

  // 1. Check prerequisites
  if (!isWhisperAvailable()) {
    process.stdout.write('❌ whisper-cli not found.\nInstall: brew install whisper-cpp\n');
    process.exit(1);
  }

  if (!binaries.ffmpeg) {
    process.stdout.write('❌ ffmpeg not found.\nInstall: brew install ffmpeg\n');
    process.exit(1);
  }

  if (!fs.existsSync(config.modelPath)) {
    process.stdout.write(`❌ Whisper model not found: ${config.modelPath}\n`);
    process.stdout.write(`Download: curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin" -o ${config.modelPath}\n`);
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
  try {
    const result = transcribe(audioPath, {
      language: config.language,
      modelPath: config.modelPath,
    });

    if (!result.text) {
      process.stdout.write('(no speech detected)\n');
    } else {
      // Output just the transcribed text — Claude Code's /voice command will use this as input
      process.stdout.write(result.text + '\n');
      logger.debug(`Transcribed in ${result.durationMs}ms`);
    }
  } finally {
    // Clean up temp file
    if (audioPath && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
  }
}
