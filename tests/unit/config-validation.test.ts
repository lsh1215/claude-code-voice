import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    default: {
      ...actual,
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
    },
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

import fs from 'fs';
import { loadConfig, DEFAULT_CONFIG } from '../../plugin/src/utils/config.js';

describe('config loading and validation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('audioDeviceIndex defaults to 0', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const config = loadConfig();
    expect(config.audioDeviceIndex).toBe(0);
  });

  it('DEFAULT_CONFIG has audioDeviceIndex = 0', () => {
    expect(DEFAULT_CONFIG.audioDeviceIndex).toBe(0);
  });

  it('partial override preserves other defaults', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ language: 'en' }));
    const config = loadConfig();
    expect(config.language).toBe('en');
    // Other defaults preserved
    expect(config.vadThreshold).toBe(DEFAULT_CONFIG.vadThreshold);
    expect(config.silenceDurationMs).toBe(DEFAULT_CONFIG.silenceDurationMs);
    expect(config.audioDeviceIndex).toBe(DEFAULT_CONFIG.audioDeviceIndex);
    expect(config.sttEngine).toBe(DEFAULT_CONFIG.sttEngine);
  });

  it('falls back to defaults on invalid JSON', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json !!!');
    const config = loadConfig();
    expect(config.language).toBe(DEFAULT_CONFIG.language);
    expect(config.vadThreshold).toBe(DEFAULT_CONFIG.vadThreshold);
  });

  it('falls back to defaults when readFileSync throws', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('EACCES: permission denied'); });
    const config = loadConfig();
    expect(config.language).toBe(DEFAULT_CONFIG.language);
  });

  it('returns defaults when config file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const config = loadConfig();
    expect(config).toMatchObject({
      sttEngine: 'whisper-cli',
      language: DEFAULT_CONFIG.language,
      vadThreshold: DEFAULT_CONFIG.vadThreshold,
      silenceDurationMs: DEFAULT_CONFIG.silenceDurationMs,
      audioDeviceIndex: 0,
      autoSubmit: false,
    });
  });

  it('audioDeviceIndex can be overridden via config file', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ audioDeviceIndex: 2 }));
    const config = loadConfig();
    expect(config.audioDeviceIndex).toBe(2);
  });

  it('all DEFAULT_CONFIG fields are present', () => {
    const requiredFields: (keyof typeof DEFAULT_CONFIG)[] = [
      'sttEngine', 'language', 'modelPath', 'vadThreshold',
      'silenceDurationMs', 'autoSubmit', 'audioDeviceIndex', 'debug',
    ];
    for (const field of requiredFields) {
      expect(DEFAULT_CONFIG).toHaveProperty(field);
    }
  });
});
