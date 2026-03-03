import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — declared before any imports that use these modules.
// ---------------------------------------------------------------------------

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      existsSync: vi.fn(() => false),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
    },
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import fs from 'fs';
import { DEFAULT_CONFIG, loadConfig } from '../../plugin/src/utils/config.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DEFAULT_CONFIG', () => {
  it('has sttEngine equal to "whisper-server"', () => {
    expect(DEFAULT_CONFIG.sttEngine).toBe('whisper-server');
  });

  it('has whisperServerPort equal to 18080', () => {
    expect(DEFAULT_CONFIG.whisperServerPort).toBe(18080);
  });

  it('has all required VoiceConfig fields', () => {
    expect(DEFAULT_CONFIG).toHaveProperty('sttEngine');
    expect(DEFAULT_CONFIG).toHaveProperty('whisperServerPort');
    expect(DEFAULT_CONFIG).toHaveProperty('language');
    expect(DEFAULT_CONFIG).toHaveProperty('modelPath');
    expect(DEFAULT_CONFIG).toHaveProperty('vadThreshold');
    expect(DEFAULT_CONFIG).toHaveProperty('silenceDurationMs');
    expect(DEFAULT_CONFIG).toHaveProperty('autoSubmit');
    expect(DEFAULT_CONFIG).toHaveProperty('audioDeviceIndex');
    expect(DEFAULT_CONFIG).toHaveProperty('debug');
  });

  it('has language equal to "ko"', () => {
    expect(DEFAULT_CONFIG.language).toBe('ko');
  });

  it('has autoSubmit equal to false', () => {
    expect(DEFAULT_CONFIG.autoSubmit).toBe(false);
  });
});

describe('loadConfig()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns sttEngine "whisper-server" when no saved config file exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const config = loadConfig();
    expect(config.sttEngine).toBe('whisper-server');
  });

  it('returns whisperServerPort 18080 when no saved config file exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const config = loadConfig();
    expect(config.whisperServerPort).toBe(18080);
  });

  it('respects saved sttEngine "whisper-cli" from config file (merges correctly)', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ sttEngine: 'whisper-cli' })
    );

    const config = loadConfig();
    expect(config.sttEngine).toBe('whisper-cli');
    // Other defaults should still be present
    expect(config.whisperServerPort).toBe(18080);
    expect(config.language).toBe('ko');
  });

  it('respects saved whisperServerPort 9090 from config file', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ whisperServerPort: 9090 })
    );

    const config = loadConfig();
    expect(config.whisperServerPort).toBe(9090);
    // sttEngine should still fall back to default
    expect(config.sttEngine).toBe('whisper-server');
  });

  it('returns defaults when config file contains invalid JSON', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('{ bad json ~~~ }');

    const config = loadConfig();
    expect(config.sttEngine).toBe('whisper-server');
    expect(config.whisperServerPort).toBe(18080);
  });

  it('merges multiple saved fields while keeping unspecified fields as defaults', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ sttEngine: 'whisper-cli', whisperServerPort: 9090, language: 'en' })
    );

    const config = loadConfig();
    expect(config.sttEngine).toBe('whisper-cli');
    expect(config.whisperServerPort).toBe(9090);
    expect(config.language).toBe('en');
    expect(config.vadThreshold).toBe(DEFAULT_CONFIG.vadThreshold);
    expect(config.silenceDurationMs).toBe(DEFAULT_CONFIG.silenceDurationMs);
  });
});
