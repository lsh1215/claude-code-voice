import { spawnSync } from 'child_process';
import fs from 'fs';
import { logger } from '../utils/logger.js';
import { loadConfig } from '../utils/config.js';

export interface TranscribeOptions {
  language?: string;    // 'ko' | 'en' | 'auto' | undefined (auto-detect)
  modelPath?: string;
}

export interface TranscribeResult {
  text: string;
  language?: string;
  durationMs: number;
}

export function isWhisperAvailable(): boolean {
  try {
    const result = spawnSync('which', ['whisper-cli'], { encoding: 'utf8' });
    return result.status === 0 && result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

export function transcribe(audioPath: string, options: TranscribeOptions = {}): TranscribeResult {
  const config = loadConfig();
  const modelPath = options.modelPath ?? config.modelPath;
  const language = options.language ?? config.language;

  if (!fs.existsSync(modelPath)) {
    throw new Error(`whisper model not found: ${modelPath}\nDownload with: curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin" -o ${modelPath}`);
  }

  const start = Date.now();

  // whisper-cli flags:
  // -m: model path
  // -l: language (ko / en / auto)
  // -np: no-prints (suppress progress)
  // -nt: no timestamps
  // last arg: input wav file
  const args = [
    '-m', modelPath,
    '-l', language === 'auto' ? 'auto' : language,
    '-np',    // no prints
    '-nt',    // no timestamps in output
    audioPath,
  ];

  logger.debug(`whisper-cli ${args.join(' ')}`);

  const result = spawnSync('whisper-cli', args, {
    encoding: 'utf8',
    timeout: 30000,
  });

  if (result.error) {
    throw new Error(`whisper-cli error: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`whisper-cli failed (${result.status}): ${result.stderr?.slice(-300)}`);
  }

  // Parse output: whisper outputs lines like "[00:00:00.000 --> 00:00:03.400]   text"
  // With -nt flag, output is plain text
  const raw = (result.stdout || '').trim();

  // Remove any remaining timestamp patterns just in case
  const text = raw
    .split('\n')
    .map(line => line.replace(/^\[[\d:.]+ --> [\d:.]+\]\s*/, '').trim())
    .filter(line => line.length > 0)
    .join(' ')
    .trim();

  return {
    text,
    durationMs: Date.now() - start,
  };
}
