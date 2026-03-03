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

vi.mock('../../plugin/src/utils/config.js', () => ({
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
    audioDeviceIndex: 0,
    debug: false,
  },
}));

import { handleVoiceConfig } from '../../plugin/src/commands/voice-config-handler.js';
import { loadConfig, saveConfig, DEFAULT_CONFIG } from '../../plugin/src/utils/config.js';
import fs from 'fs';

describe('voice-config boundary values', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  const mockConfig = {
    sttEngine: 'whisper-cli' as const,
    language: 'ko',
    modelPath: '/mock/models/ggml-base.bin',
    vadThreshold: 0.02,
    silenceDurationMs: 1500,
    autoSubmit: false,
    audioDeviceIndex: 0,
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

  // silenceDurationMs boundary tests
  it('silenceDurationMs 499 → error (below minimum 500)', async () => {
    await handleVoiceConfig(['set', 'silenceDurationMs', '499']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('silenceDurationMs must be between');
  });

  it('silenceDurationMs 500 → success (lower boundary)', async () => {
    await handleVoiceConfig(['set', 'silenceDurationMs', '500']);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(saveConfig).toHaveBeenCalledWith({ silenceDurationMs: 500 });
  });

  it('silenceDurationMs 5000 → success (upper boundary)', async () => {
    await handleVoiceConfig(['set', 'silenceDurationMs', '5000']);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(saveConfig).toHaveBeenCalledWith({ silenceDurationMs: 5000 });
  });

  it('silenceDurationMs 5001 → error (above maximum 5000)', async () => {
    await handleVoiceConfig(['set', 'silenceDurationMs', '5001']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  // vadThreshold boundary tests
  it('vadThreshold 0.0009 → error (below minimum 0.001)', async () => {
    await handleVoiceConfig(['set', 'vadThreshold', '0.0009']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('vadThreshold must be between');
  });

  it('vadThreshold 0.001 → success (lower boundary)', async () => {
    await handleVoiceConfig(['set', 'vadThreshold', '0.001']);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(saveConfig).toHaveBeenCalledWith({ vadThreshold: 0.001 });
  });

  it('vadThreshold 0.5 → success (upper boundary)', async () => {
    await handleVoiceConfig(['set', 'vadThreshold', '0.5']);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(saveConfig).toHaveBeenCalledWith({ vadThreshold: 0.5 });
  });

  it('vadThreshold 0.5001 → error (above maximum 0.5)', async () => {
    await handleVoiceConfig(['set', 'vadThreshold', '0.5001']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  // audioDeviceIndex boundary tests
  it('audioDeviceIndex 0 → success', async () => {
    await handleVoiceConfig(['set', 'audioDeviceIndex', '0']);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(saveConfig).toHaveBeenCalledWith({ audioDeviceIndex: 0 });
  });

  it('audioDeviceIndex 1 → success', async () => {
    await handleVoiceConfig(['set', 'audioDeviceIndex', '1']);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(saveConfig).toHaveBeenCalledWith({ audioDeviceIndex: 1 });
  });

  it('audioDeviceIndex -1 → error (negative not allowed)', async () => {
    await handleVoiceConfig(['set', 'audioDeviceIndex', '-1']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('audioDeviceIndex 2.5 → error (non-integer not allowed)', async () => {
    await handleVoiceConfig(['set', 'audioDeviceIndex', '2.5']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  // language boundary tests
  it('language "ja" → error (not in allowed list)', async () => {
    await handleVoiceConfig(['set', 'language', 'ja']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('invalid language');
  });

  it('language "ko" → success', async () => {
    await handleVoiceConfig(['set', 'language', 'ko']);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(saveConfig).toHaveBeenCalledWith({ language: 'ko' });
  });

  it('language "en" → success', async () => {
    await handleVoiceConfig(['set', 'language', 'en']);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(saveConfig).toHaveBeenCalledWith({ language: 'en' });
  });

  it('language "auto" → success', async () => {
    await handleVoiceConfig(['set', 'language', 'auto']);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(saveConfig).toHaveBeenCalledWith({ language: 'auto' });
  });

  // modelPath boundary tests
  it('modelPath /nonexistent → error (file not found)', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    await handleVoiceConfig(['set', 'modelPath', '/nonexistent/model.bin']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('model file not found');
  });

  // Unknown key
  it('unknown key → error', async () => {
    await handleVoiceConfig(['set', 'unknownKey', 'value']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('unknown key');
    expect(output).toContain('unknownKey');
  });

  // reset test
  it('reset restores DEFAULT_CONFIG values', async () => {
    await handleVoiceConfig(['reset']);
    expect(saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        language: DEFAULT_CONFIG.language,
        vadThreshold: DEFAULT_CONFIG.vadThreshold,
        silenceDurationMs: DEFAULT_CONFIG.silenceDurationMs,
        audioDeviceIndex: DEFAULT_CONFIG.audioDeviceIndex,
      })
    );
  });
});
