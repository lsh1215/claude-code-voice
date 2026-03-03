import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// CLI output contract tests
// These test the output FORMAT and structure of the CLI commands
// without running actual binaries

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    default: {
      ...actual,
      existsSync: vi.fn(),
      unlinkSync: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
    },
    existsSync: vi.fn(),
    unlinkSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

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
    audioDeviceIndex: 0,
    debug: false,
  },
}));

import { handleVoiceConfig } from '../../src/commands/voice-config-handler.js';
import { loadConfig } from '../../src/utils/config.js';

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

describe('voice-config CLI output contract', () => {
  let stdoutCalls: string[];
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutCalls = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((s) => { stdoutCalls.push(String(s)); return true; });
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    vi.mocked(loadConfig).mockReturnValue({ ...mockConfig });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('voice-config show: outputs key=value format', async () => {
    await handleVoiceConfig(['show']);
    const output = stdoutCalls.join('');
    // Should output settings in key = value format
    expect(output).toMatch(/language\s*=\s*ko/);
    expect(output).toMatch(/silenceDurationMs\s*=\s*1500/);
    expect(output).toMatch(/vadThreshold\s*=\s*0\.02/);
  });

  it('voice-config show: includes all config fields', async () => {
    await handleVoiceConfig(['show']);
    const output = stdoutCalls.join('');
    expect(output).toContain('language');
    expect(output).toContain('silenceDurationMs');
    expect(output).toContain('vadThreshold');
    expect(output).toContain('modelPath');
  });

  it('voice-config show: includes config file path', async () => {
    await handleVoiceConfig(['show']);
    const output = stdoutCalls.join('');
    expect(output).toContain('config.json');
  });

  it('voice-config help (no args): shows available subcommands', async () => {
    await handleVoiceConfig([]);
    const output = stdoutCalls.join('');
    expect(output.toLowerCase()).toContain('show');
    expect(output.toLowerCase()).toContain('set');
    expect(output.toLowerCase()).toContain('reset');
  });

  it('voice-config set success: outputs confirmation message', async () => {
    await handleVoiceConfig(['set', 'language', 'en']);
    const output = stdoutCalls.join('');
    expect(output).toContain('language');
    expect(output).toContain('en');
  });

  it('voice-config set error: exit 1 + error message to stdout', async () => {
    await handleVoiceConfig(['set', 'language', 'zz']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutCalls.join('');
    expect(output.toLowerCase()).toContain('error');
  });

  it('voice-config unknown subcommand: shows help (no crash)', async () => {
    await handleVoiceConfig(['unknown-subcommand']);
    // Should show help, not crash
    const output = stdoutCalls.join('');
    expect(output.length).toBeGreaterThan(0);
  });
});
