import fs from 'fs';
import path from 'path';
import os from 'os';

export interface VoiceConfig {
  sttEngine: 'whisper-cli' | 'whisper-server';
  language: string;          // 'ko' | 'en' | 'auto'
  modelPath: string;         // path to ggml model
  vadThreshold: number;      // 0.01-0.1, default 0.02
  silenceDurationMs: number; // default 1500
  autoSubmit: boolean;       // default false (show text first)
  audioDeviceIndex: number;  // avfoundation audio device index (default 0)
  whisperServerPort: number; // default 18080
  debug: boolean;
}

const CONFIG_DIR = path.join(os.homedir(), '.claude', 'plugins', 'voice');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

// Default model path: try turbo model first, then base model
function getDefaultModelPath(): string {
  const projectRoot = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..', '..', '..'
  );
  const candidates = [
    path.join(projectRoot, 'models', 'ggml-large-v3-turbo-q5_0.bin'),
    path.join(projectRoot, 'models', 'ggml-base.bin'),
    path.join(os.homedir(), '.cache', 'whisper', 'ggml-large-v3-turbo-q5_0.bin'),
    path.join(os.homedir(), '.cache', 'whisper', 'ggml-base.bin'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return path.resolve(p);
  }
  // Return turbo project path as download target
  return path.resolve(candidates[0]);
}

export const DEFAULT_CONFIG: VoiceConfig = {
  sttEngine: 'whisper-server',
  language: 'ko',
  modelPath: getDefaultModelPath(),
  vadThreshold: 0.02,
  silenceDurationMs: 1500,
  autoSubmit: false,
  audioDeviceIndex: 0,
  whisperServerPort: 18080,
  debug: process.env.CLAUDE_VOICE_DEBUG === '1',
};

export function loadConfig(): VoiceConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // ignore, use defaults
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: Partial<VoiceConfig>): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const current = loadConfig();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...current, ...config }, null, 2));
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}
