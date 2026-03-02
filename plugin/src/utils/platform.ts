import { execSync } from 'child_process';
import os from 'os';

export type Platform = 'darwin' | 'linux' | 'unsupported';

export function getPlatform(): Platform {
  const platform = os.platform();
  if (platform === 'darwin') return 'darwin';
  if (platform === 'linux') return 'linux';
  return 'unsupported';
}

export interface AvailableBinaries {
  whisperCli: string | null;   // 'whisper-cli' | null
  ffmpeg: string | null;
  sox: string | null;          // optional fallback
  arecord: string | null;      // Linux
}

function which(cmd: string): string | null {
  try {
    return execSync(`which ${cmd} 2>/dev/null`, { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}

export function detectBinaries(): AvailableBinaries {
  return {
    whisperCli: which('whisper-cli'),
    ffmpeg: which('ffmpeg'),
    sox: which('sox'),
    arecord: which('arecord'),
  };
}

export function getAudioRecorder(binaries: AvailableBinaries): string | null {
  if (binaries.sox) return 'sox';
  if (binaries.ffmpeg) return 'ffmpeg';
  if (binaries.arecord) return 'arecord';
  return null;
}
