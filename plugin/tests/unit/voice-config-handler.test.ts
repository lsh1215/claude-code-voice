import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs module before importing the handler
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

// Mock config module
vi.mock('../../src/utils/config.js', () => ({
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
  getConfigDir: vi.fn(() => '/mock/.claude/plugins/voice'),
  DEFAULT_CONFIG: {
    sttEngine: 'whisper-cli',
    language: 'ko',
    modelPath: '/mock/models/ggml-base.bin',
    vadThreshold: 0.02,
    silenceDurationMs: 1500,
    autoSubmit: false,
    debug: false,
  },
}));

import { handleVoiceConfig } from '../../src/commands/voice-config-handler.js';
import { loadConfig, saveConfig, DEFAULT_CONFIG } from '../../src/utils/config.js';
import fs from 'fs';

describe('handleVoiceConfig', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  const mockConfig = {
    sttEngine: 'whisper-cli' as const,
    language: 'ko',
    modelPath: '/mock/models/ggml-base.bin',
    vadThreshold: 0.02,
    silenceDurationMs: 1500,
    autoSubmit: false,
    debug: false,
  };

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    vi.mocked(loadConfig).mockReturnValue({ ...mockConfig });
    vi.mocked(saveConfig).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('show prints current config', async () => {
    await handleVoiceConfig(['show']);

    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('language');
    expect(output).toContain('ko');
    expect(output).toContain('silenceDurationMs');
    expect(output).toContain('1500');
    expect(output).toContain('vadThreshold');
    expect(output).toContain('0.02');
  });

  it('set language en updates config', async () => {
    await handleVoiceConfig(['set', 'language', 'en']);

    expect(saveConfig).toHaveBeenCalledWith({ language: 'en' });
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('language set to: en');
  });

  it('set language auto updates config', async () => {
    await handleVoiceConfig(['set', 'language', 'auto']);

    expect(saveConfig).toHaveBeenCalledWith({ language: 'auto' });
  });

  it('set language with invalid value exits with error', async () => {
    await handleVoiceConfig(['set', 'language', 'fr']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('invalid language');
  });

  it('set silenceDurationMs validates range - valid value', async () => {
    await handleVoiceConfig(['set', 'silenceDurationMs', '2000']);

    expect(saveConfig).toHaveBeenCalledWith({ silenceDurationMs: 2000 });
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('silenceDurationMs set to: 2000');
  });

  it('set silenceDurationMs rejects value below range', async () => {
    await handleVoiceConfig(['set', 'silenceDurationMs', '100']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('silenceDurationMs must be between');
  });

  it('set silenceDurationMs rejects value above range', async () => {
    await handleVoiceConfig(['set', 'silenceDurationMs', '9999']);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('set vadThreshold validates range - valid value', async () => {
    await handleVoiceConfig(['set', 'vadThreshold', '0.03']);

    expect(saveConfig).toHaveBeenCalledWith({ vadThreshold: 0.03 });
  });

  it('set vadThreshold rejects out-of-range value', async () => {
    await handleVoiceConfig(['set', 'vadThreshold', '0.9']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('vadThreshold must be between');
  });

  it('set modelPath validates file exists', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    await handleVoiceConfig(['set', 'modelPath', '/real/model.bin']);

    expect(saveConfig).toHaveBeenCalledWith({ modelPath: '/real/model.bin' });
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('modelPath set to');
  });

  it('set modelPath rejects missing file', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    await handleVoiceConfig(['set', 'modelPath', '/nonexistent/model.bin']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('model file not found');
  });

  it('reset writes defaults', async () => {
    await handleVoiceConfig(['reset']);

    expect(saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        language: DEFAULT_CONFIG.language,
        vadThreshold: DEFAULT_CONFIG.vadThreshold,
        silenceDurationMs: DEFAULT_CONFIG.silenceDurationMs,
      })
    );
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('reset to defaults');
  });

  it('unknown key exits with error', async () => {
    await handleVoiceConfig(['set', 'unknownKey', 'value']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('unknown key');
    expect(output).toContain('unknownKey');
  });

  it('no args shows help with current config', async () => {
    await handleVoiceConfig([]);

    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('voice-config');
    expect(output).toContain('Subcommands');
  });

  it('set with missing value exits with error', async () => {
    await handleVoiceConfig(['set', 'language']);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
