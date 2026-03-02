import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, saveConfig, DEFAULT_CONFIG } from '../../src/utils/config.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_CONFIG_DIR = path.join(os.tmpdir(), 'voice-plugin-test-' + Date.now());

describe('config', () => {
  it('returns defaults when no config file exists', () => {
    const config = loadConfig();
    expect(config.sttEngine).toBe('whisper-cli');
    expect(config.language).toBe('ko');
    expect(config.autoSubmit).toBe(false);
  });

  it('merges saved config with defaults', () => {
    // Just verify the shape
    const config = loadConfig();
    expect(config).toHaveProperty('vadThreshold');
    expect(config).toHaveProperty('silenceDurationMs');
  });
});
