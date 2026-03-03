import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — declared before any imports that use these modules.
// ---------------------------------------------------------------------------

vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { spawnSync } from 'child_process';
import { detectPreferredMicIndex } from '../../plugin/src/utils/device-detector.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFfmpegStderr(stderr: string) {
  vi.mocked(spawnSync).mockReturnValue({
    status: 1,
    stdout: '',
    stderr,
    pid: 100,
    output: [],
    signal: null,
    error: undefined,
  } as any);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('detectPreferredMicIndex()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 when no devices are found (empty output)', () => {
    mockFfmpegStderr('');
    expect(detectPreferredMicIndex()).toBe(0);
  });

  it('returns 0 when the only device is MacBook Pro Microphone at index [0]', () => {
    mockFfmpegStderr(
      "[AVFoundation indev @ 0xabc] AVFoundation audio devices:\n" +
      "[AVFoundation indev @ 0xabc] [0] 'MacBook Pro Microphone'\n"
    );
    expect(detectPreferredMicIndex()).toBe(0);
  });

  it('returns 1 when iPhone Microphone is at [0] and MacBook Pro Microphone is at [1]', () => {
    mockFfmpegStderr(
      "[AVFoundation indev @ 0xabc] AVFoundation audio devices:\n" +
      "[AVFoundation indev @ 0xabc] [0] 'iPhone Microphone'\n" +
      "[AVFoundation indev @ 0xabc] [1] 'MacBook Pro Microphone'\n"
    );
    expect(detectPreferredMicIndex()).toBe(1);
  });

  it('returns 0 when there is no iPhone/iPad/AirPods in the list (multiple non-excluded devices, picks first)', () => {
    mockFfmpegStderr(
      "[AVFoundation indev @ 0xabc] AVFoundation audio devices:\n" +
      "[AVFoundation indev @ 0xabc] [0] 'ZoomAudioDevice'\n" +
      "[AVFoundation indev @ 0xabc] [1] 'MacBook Pro Microphone'\n"
    );
    // Both are non-iPhone; picks the first one at index 0
    expect(detectPreferredMicIndex()).toBe(0);
  });

  it('returns 2 when iPhone at [0], AirPods at [1], and MacBook Pro at [2]', () => {
    mockFfmpegStderr(
      "[AVFoundation indev @ 0xabc] AVFoundation audio devices:\n" +
      "[AVFoundation indev @ 0xabc] [0] 'iPhone Microphone'\n" +
      "[AVFoundation indev @ 0xabc] [1] 'AirPods Microphone'\n" +
      "[AVFoundation indev @ 0xabc] [2] 'MacBook Pro Microphone'\n"
    );
    expect(detectPreferredMicIndex()).toBe(2);
  });

  it('returns 0 when all devices are excluded (iPhone, iPad, AirPods only)', () => {
    mockFfmpegStderr(
      "[AVFoundation indev @ 0xabc] AVFoundation audio devices:\n" +
      "[AVFoundation indev @ 0xabc] [0] 'iPhone Microphone'\n" +
      "[AVFoundation indev @ 0xabc] [1] 'iPad Microphone'\n" +
      "[AVFoundation indev @ 0xabc] [2] 'AirPods Pro'\n"
    );
    // No non-excluded device → falls back to 0
    expect(detectPreferredMicIndex()).toBe(0);
  });

  it('passes the correct ffmpeg arguments to spawnSync', () => {
    mockFfmpegStderr('');
    detectPreferredMicIndex();
    expect(spawnSync).toHaveBeenCalledWith(
      'ffmpeg',
      ['-f', 'avfoundation', '-list_devices', 'true', '-i', ''],
      { encoding: 'utf8' }
    );
  });
});
