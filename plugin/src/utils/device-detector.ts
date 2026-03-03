import { spawnSync } from 'child_process';

/**
 * Auto-detect the preferred microphone index for ffmpeg avfoundation.
 * When iPhone is connected via Continuity Camera, it appears as device [0],
 * pushing MacBook's built-in mic to [1]. This function returns the index
 * of the first non-iPhone/iPad/AirPods device.
 */
export function detectPreferredMicIndex(): number {
  const result = spawnSync(
    'ffmpeg',
    ['-f', 'avfoundation', '-list_devices', 'true', '-i', ''],
    { encoding: 'utf8' }
  );
  const output = result.stderr ?? '';

  // Parse lines like: [0] 'iPhone Microphone'  [1] 'MacBook Pro Microphone'
  const pattern = /\[(\d+)\]\s+'([^']+)'/g;
  const devices: Array<{ idx: number; name: string }> = [];
  let match;
  while ((match = pattern.exec(output)) !== null) {
    devices.push({ idx: parseInt(match[1], 10), name: match[2] });
  }

  // Exclude iPhone/iPad/AirPods, prefer MacBook Pro / Built-in Microphone
  const excluded = /iPhone|iPad|AirPods/i;
  const preferred = devices.find(d => !excluded.test(d.name));
  return preferred?.idx ?? 0;
}
