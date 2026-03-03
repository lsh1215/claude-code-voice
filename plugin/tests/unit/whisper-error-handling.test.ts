import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    default: { ...actual, existsSync: vi.fn(() => true) },
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

vi.mock('../../src/utils/config.js', () => ({
  loadConfig: vi.fn(() => ({
    sttEngine: 'whisper-cli',
    language: 'ko',
    modelPath: '/mock/model.bin',
    vadThreshold: 0.02,
    silenceDurationMs: 1500,
    autoSubmit: false,
    audioDeviceIndex: 0,
    debug: false,
  })),
  DEFAULT_CONFIG: {
    sttEngine: 'whisper-cli',
    language: 'ko',
    modelPath: '/mock/model.bin',
    vadThreshold: 0.02,
    silenceDurationMs: 1500,
    autoSubmit: false,
    audioDeviceIndex: 0,
    debug: false,
  },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { spawnSync } from 'child_process';
import { transcribe } from '../../src/stt/whisper-engine.js';

describe('transcribe error handling', () => {
  beforeEach(() => {
    // Use clearAllMocks (not resetAllMocks) to preserve mock factory implementations.
    // resetAllMocks would clear the loadConfig() return value set in vi.mock() factory.
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws on non-zero exit code', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 1,
      stdout: '',
      stderr: 'whisper error occurred',
      error: undefined,
      pid: 1234,
      output: [],
      signal: null,
    });
    expect(() => transcribe('/tmp/test.wav', { modelPath: '/mock/model.bin' }))
      .toThrow(/whisper-cli failed/);
  });

  it('throws on spawnSync error (binary not found)', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: null,
      stdout: '',
      stderr: '',
      error: new Error('spawn whisper-cli ENOENT'),
      pid: 0,
      output: [],
      signal: null,
    });
    expect(() => transcribe('/tmp/test.wav', { modelPath: '/mock/model.bin' }))
      .toThrow(/whisper-cli error/);
  });

  it('returns empty text when stdout is empty', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
      error: undefined,
      pid: 1234,
      output: [],
      signal: null,
    });
    const result = transcribe('/tmp/test.wav', { modelPath: '/mock/model.bin' });
    expect(result.text).toBe('');
  });

  it('strips timestamp patterns from output', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '[00:00:00.000 --> 00:00:03.400]   Hello world',
      stderr: '',
      error: undefined,
      pid: 1234,
      output: [],
      signal: null,
    });
    const result = transcribe('/tmp/test.wav', { modelPath: '/mock/model.bin' });
    expect(result.text).toBe('Hello world');
    expect(result.text).not.toContain('[');
    expect(result.text).not.toContain('-->');
  });

  it('joins multiple lines with space', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: 'First line\nSecond line\nThird line',
      stderr: '',
      error: undefined,
      pid: 1234,
      output: [],
      signal: null,
    });
    const result = transcribe('/tmp/test.wav', { modelPath: '/mock/model.bin' });
    expect(result.text).toBe('First line Second line Third line');
  });

  it('handles Korean and English mixed output', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: 'auth.py에서 JWT token 처리해줘',
      stderr: '',
      error: undefined,
      pid: 1234,
      output: [],
      signal: null,
    });
    const result = transcribe('/tmp/test.wav', { modelPath: '/mock/model.bin' });
    expect(result.text).toBe('auth.py에서 JWT token 처리해줘');
  });

  it('returns durationMs as a number', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: 'test',
      stderr: '',
      error: undefined,
      pid: 1234,
      output: [],
      signal: null,
    });
    const result = transcribe('/tmp/test.wav', { modelPath: '/mock/model.bin' });
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('strips multiple timestamp patterns from multi-line output', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '[00:00:00.000 --> 00:00:02.000]   안녕하세요\n[00:00:02.000 --> 00:00:04.000]   Hello',
      stderr: '',
      error: undefined,
      pid: 1234,
      output: [],
      signal: null,
    });
    const result = transcribe('/tmp/test.wav', { modelPath: '/mock/model.bin' });
    expect(result.text).toBe('안녕하세요 Hello');
  });
});
