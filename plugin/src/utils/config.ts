import fs from 'fs';
import path from 'path';
import os from 'os';

export interface VoiceConfig {
  sttEngine: 'whisper-cli';
  language: string;          // 'ko' | 'en' | 'auto'
  modelPath: string;         // path to ggml model
  vadThreshold: number;      // 0.01-0.1, default 0.02
  silenceDurationMs: number; // default 1500
  autoSubmit: boolean;       // default false (show text first)
  debug: boolean;
}

const CONFIG_DIR = path.join(os.homedir(), '.claude', 'plugins', 'voice');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

// Default model path: look in project first, then ~/.cache/whisper
function getDefaultModelPath(): string {
  const projectModel = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    '..', '..', '..', 'models', 'ggml-base.bin'
  );
  if (fs.existsSync(projectModel)) return path.resolve(projectModel);
  return path.join(os.homedir(), '.cache', 'whisper', 'ggml-base.bin');
}

export const DEFAULT_CONFIG: VoiceConfig = {
  sttEngine: 'whisper-cli',
  language: 'ko',
  modelPath: getDefaultModelPath(),
  vadThreshold: 0.02,
  silenceDurationMs: 1500,
  autoSubmit: false,
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
