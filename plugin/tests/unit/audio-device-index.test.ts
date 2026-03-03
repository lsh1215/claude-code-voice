import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test by checking that captureAudio/captureAudioWithVAD pass audioDeviceIndex to ffmpeg args
// by mocking child_process.spawn and checking the args

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    default: {
      ...actual,
      writeFileSync: vi.fn(),
      existsSync: vi.fn(() => false),
    },
    writeFileSync: vi.fn(),
    existsSync: vi.fn(() => false),
  };
});

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Helper to create a mock ffmpeg process that immediately exits
function createMockProcess(exitCode = 0) {
  const proc = new EventEmitter() as any;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.stdin = { end: vi.fn() };
  proc.kill = vi.fn();
  // Emit close after a short time
  setTimeout(() => {
    proc.stdout.emit('end');
    proc.emit('close', exitCode);
  }, 10);
  return proc;
}

describe('audioDeviceIndex in ffmpeg arguments', () => {
  let spawnArgs: string[] = [];

  beforeEach(() => {
    vi.resetAllMocks();
    spawnArgs = [];
    vi.mocked(spawn).mockImplementation((_cmd: string, args: string[]) => {
      spawnArgs = args;
      return createMockProcess(0);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('captureAudio with default audioDeviceIndex uses :0', async () => {
    const { captureAudio } = await import('../../src/stt/audio-capture.js');

    // We expect this to fail (no real ffmpeg) but we can inspect args
    try {
      await captureAudio({ durationMs: 100, sampleRate: 16000 });
    } catch {
      // expected - no real ffmpeg
    }

    // Check spawn was called with :0 in args
    const inputArg = spawnArgs.join(' ');
    expect(inputArg).toMatch(/:0/);
  });

  it('captureAudio with audioDeviceIndex=1 uses :1', async () => {
    const { captureAudio } = await import('../../src/stt/audio-capture.js');

    try {
      await captureAudio({ durationMs: 100, sampleRate: 16000, audioDeviceIndex: 1 });
    } catch {
      // expected
    }

    const inputArg = spawnArgs.join(' ');
    expect(inputArg).toMatch(/:1/);
  });

  it('captureAudio with audioDeviceIndex=2 uses :2', async () => {
    const { captureAudio } = await import('../../src/stt/audio-capture.js');

    try {
      await captureAudio({ durationMs: 100, sampleRate: 16000, audioDeviceIndex: 2 });
    } catch {
      // expected
    }

    const inputArg = spawnArgs.join(' ');
    expect(inputArg).toMatch(/:2/);
  });
});
