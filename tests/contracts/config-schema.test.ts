import { describe, it, expect, vi } from 'vitest';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    default: {
      ...actual,
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

import { DEFAULT_CONFIG, loadConfig, VoiceConfig } from '../../plugin/src/utils/config.js';

describe('config schema contract', () => {
  it('DEFAULT_CONFIG has all required VoiceConfig fields', () => {
    // Every required field of VoiceConfig must be in DEFAULT_CONFIG
    const requiredFields: (keyof VoiceConfig)[] = [
      'sttEngine',
      'language',
      'modelPath',
      'vadThreshold',
      'silenceDurationMs',
      'autoSubmit',
      'audioDeviceIndex',
      'debug',
    ];

    for (const field of requiredFields) {
      expect(DEFAULT_CONFIG).toHaveProperty(field);
    }
  });

  it('DEFAULT_CONFIG field types match VoiceConfig interface', () => {
    expect(typeof DEFAULT_CONFIG.sttEngine).toBe('string');
    expect(typeof DEFAULT_CONFIG.language).toBe('string');
    expect(typeof DEFAULT_CONFIG.modelPath).toBe('string');
    expect(typeof DEFAULT_CONFIG.vadThreshold).toBe('number');
    expect(typeof DEFAULT_CONFIG.silenceDurationMs).toBe('number');
    expect(typeof DEFAULT_CONFIG.autoSubmit).toBe('boolean');
    expect(typeof DEFAULT_CONFIG.audioDeviceIndex).toBe('number');
    expect(typeof DEFAULT_CONFIG.debug).toBe('boolean');
  });

  it('sttEngine value is "whisper-cli"', () => {
    expect(DEFAULT_CONFIG.sttEngine).toBe('whisper-cli');
  });

  it('vadThreshold is within valid range [0.001, 0.5]', () => {
    expect(DEFAULT_CONFIG.vadThreshold).toBeGreaterThanOrEqual(0.001);
    expect(DEFAULT_CONFIG.vadThreshold).toBeLessThanOrEqual(0.5);
  });

  it('silenceDurationMs is within valid range [500, 5000]', () => {
    expect(DEFAULT_CONFIG.silenceDurationMs).toBeGreaterThanOrEqual(500);
    expect(DEFAULT_CONFIG.silenceDurationMs).toBeLessThanOrEqual(5000);
  });

  it('audioDeviceIndex is non-negative integer', () => {
    expect(DEFAULT_CONFIG.audioDeviceIndex).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(DEFAULT_CONFIG.audioDeviceIndex)).toBe(true);
  });

  it('language is one of allowed values', () => {
    expect(['ko', 'en', 'auto']).toContain(DEFAULT_CONFIG.language);
  });

  it('loadConfig() returns all VoiceConfig fields', () => {
    const config = loadConfig();
    const requiredFields: (keyof VoiceConfig)[] = [
      'sttEngine', 'language', 'modelPath', 'vadThreshold',
      'silenceDurationMs', 'autoSubmit', 'audioDeviceIndex', 'debug',
    ];
    for (const field of requiredFields) {
      expect(config).toHaveProperty(field);
    }
  });

  it('loadConfig() returns correct types', () => {
    const config = loadConfig();
    expect(typeof config.sttEngine).toBe('string');
    expect(typeof config.language).toBe('string');
    expect(typeof config.modelPath).toBe('string');
    expect(typeof config.vadThreshold).toBe('number');
    expect(typeof config.silenceDurationMs).toBe('number');
    expect(typeof config.autoSubmit).toBe('boolean');
    expect(typeof config.audioDeviceIndex).toBe('number');
    expect(typeof config.debug).toBe('boolean');
  });

  it('loadConfig() returns DEFAULT_CONFIG values when no file exists', () => {
    const config = loadConfig();
    expect(config.sttEngine).toBe(DEFAULT_CONFIG.sttEngine);
    expect(config.vadThreshold).toBe(DEFAULT_CONFIG.vadThreshold);
    expect(config.silenceDurationMs).toBe(DEFAULT_CONFIG.silenceDurationMs);
    expect(config.audioDeviceIndex).toBe(DEFAULT_CONFIG.audioDeviceIndex);
  });
});
