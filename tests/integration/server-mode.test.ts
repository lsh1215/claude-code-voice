import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — declared before any imports that use these modules.
// ---------------------------------------------------------------------------

vi.mock('../../plugin/src/stt/whisper-server-manager.js', () => ({
  stopWhisperServer: vi.fn(),
  isWhisperServerAvailable: vi.fn(() => true),
  readServerInfo: vi.fn(() => ({ pid: 1234, port: 18080 })),
  isServerAlive: vi.fn(() => true),
  startWhisperServer: vi.fn(),
  transcribeViaServer: vi.fn(() => Promise.resolve('hello')),
}));

vi.mock('../../plugin/src/utils/device-detector.js', () => ({
  detectPreferredMicIndex: vi.fn(() => 1),
}));

vi.mock('../../plugin/src/stt/whisper-engine.js', () => ({
  isWhisperAvailable: vi.fn(() => true),
  transcribe: vi.fn(() => ({ text: 'fallback result', durationMs: 100 })),
}));

vi.mock('../../plugin/src/stt/audio-capture.js', () => ({
  captureAudio: vi.fn(() => Promise.resolve('/tmp/test.wav')),
}));

vi.mock('../../plugin/src/vad/silence-vad.js', () => ({
  captureAudioWithVAD: vi.fn(() => Promise.resolve('/tmp/test.wav')),
}));

vi.mock('../../plugin/src/utils/platform.js', () => ({
  detectBinaries: vi.fn(() => ({
    whisperCli: '/usr/local/bin/whisper-cli',
    ffmpeg: '/usr/local/bin/ffmpeg',
    sox: null,
    arecord: null,
  })),
  getPlatform: vi.fn(() => 'darwin'),
  getAudioRecorder: vi.fn(() => 'ffmpeg'),
}));

vi.mock('../../plugin/src/utils/config.js', () => ({
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
  getConfigDir: vi.fn(() => '/mock/.claude/plugins/voice'),
  DEFAULT_CONFIG: {
    sttEngine: 'whisper-server' as const,
    language: 'ko',
    modelPath: '/mock/models/ggml-large-v3-turbo-q5_0.bin',
    vadThreshold: 0.02,
    silenceDurationMs: 1500,
    autoSubmit: false,
    audioDeviceIndex: 0,
    whisperServerPort: 18080,
    debug: false,
  },
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
      unlinkSync: vi.fn(),
    },
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { handleVoiceConfig } from '../../plugin/src/commands/voice-config-handler.js';
import { handleVoice } from '../../plugin/src/commands/voice-handler.js';
import { stopWhisperServer, startWhisperServer, isWhisperServerAvailable, readServerInfo, isServerAlive, transcribeViaServer } from '../../plugin/src/stt/whisper-server-manager.js';
import { isWhisperAvailable } from '../../plugin/src/stt/whisper-engine.js';
import { detectPreferredMicIndex } from '../../plugin/src/utils/device-detector.js';
import { loadConfig, saveConfig, DEFAULT_CONFIG } from '../../plugin/src/utils/config.js';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_CONFIG = {
  sttEngine: 'whisper-server' as const,
  language: 'ko',
  modelPath: '/mock/models/ggml-large-v3-turbo-q5_0.bin',
  vadThreshold: 0.02,
  silenceDurationMs: 1500,
  autoSubmit: false,
  audioDeviceIndex: 0,
  whisperServerPort: 18080,
  debug: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('voice-config subcommands — server-mode integration', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    vi.mocked(loadConfig).mockReturnValue({ ...MOCK_CONFIG });
    vi.mocked(saveConfig).mockImplementation(() => {});
    vi.mocked(stopWhisperServer).mockImplementation(() => {});
    vi.mocked(detectPreferredMicIndex).mockReturnValue(1);
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  // -------------------------------------------------------------------------
  // stop-server
  // -------------------------------------------------------------------------

  it('stop-server calls stopWhisperServer and writes a success message', async () => {
    await handleVoiceConfig(['stop-server']);

    expect(stopWhisperServer).toHaveBeenCalledOnce();
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('whisper-server stopped');
  });

  // -------------------------------------------------------------------------
  // detect-mic
  // -------------------------------------------------------------------------

  it('detect-mic calls detectPreferredMicIndex, saves config, and writes index message', async () => {
    await handleVoiceConfig(['detect-mic']);

    expect(detectPreferredMicIndex).toHaveBeenCalledOnce();
    expect(saveConfig).toHaveBeenCalledWith({ audioDeviceIndex: 1 });
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('audioDeviceIndex auto-set to: 1');
  });

  // -------------------------------------------------------------------------
  // set language
  // -------------------------------------------------------------------------

  it('set language ko calls stopWhisperServer after saving', async () => {
    await handleVoiceConfig(['set', 'language', 'ko']);

    expect(saveConfig).toHaveBeenCalledWith({ language: 'ko' });
    expect(stopWhisperServer).toHaveBeenCalledOnce();
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('language set to: ko');
  });

  // -------------------------------------------------------------------------
  // set modelPath
  // -------------------------------------------------------------------------

  it('set modelPath /some/path/exists.bin calls stopWhisperServer after saving', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    await handleVoiceConfig(['set', 'modelPath', '/some/path/exists.bin']);

    expect(saveConfig).toHaveBeenCalledWith({ modelPath: '/some/path/exists.bin' });
    expect(stopWhisperServer).toHaveBeenCalledOnce();
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('modelPath set to: /some/path/exists.bin');
  });

  // -------------------------------------------------------------------------
  // set sttEngine
  // -------------------------------------------------------------------------

  it('set sttEngine whisper-server saves correctly', async () => {
    await handleVoiceConfig(['set', 'sttEngine', 'whisper-server']);

    expect(saveConfig).toHaveBeenCalledWith({ sttEngine: 'whisper-server' });
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('sttEngine set to: whisper-server');
  });

  it('set sttEngine whisper-cli saves correctly', async () => {
    await handleVoiceConfig(['set', 'sttEngine', 'whisper-cli']);

    expect(saveConfig).toHaveBeenCalledWith({ sttEngine: 'whisper-cli' });
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('sttEngine set to: whisper-cli');
  });

  it('set sttEngine invalid exits with error message', async () => {
    await handleVoiceConfig(['set', 'sttEngine', 'invalid-engine']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('sttEngine must be');
  });

  // -------------------------------------------------------------------------
  // set whisperServerPort
  // -------------------------------------------------------------------------

  it('set whisperServerPort 9090 saves port and calls stopWhisperServer', async () => {
    await handleVoiceConfig(['set', 'whisperServerPort', '9090']);

    expect(saveConfig).toHaveBeenCalledWith({ whisperServerPort: 9090 });
    expect(stopWhisperServer).toHaveBeenCalledOnce();
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('whisperServerPort set to: 9090');
  });

  it('set whisperServerPort 80 exits with error (below 1024)', async () => {
    await handleVoiceConfig(['set', 'whisperServerPort', '80']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(saveConfig).not.toHaveBeenCalled();
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('whisperServerPort must be an integer 1024-65535');
  });

  it('set whisperServerPort 99999 exits with error (above 65535)', async () => {
    await handleVoiceConfig(['set', 'whisperServerPort', '99999']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(saveConfig).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // reset
  // -------------------------------------------------------------------------

  it('reset calls stopWhisperServer and resets all fields including sttEngine and whisperServerPort', async () => {
    await handleVoiceConfig(['reset']);

    expect(stopWhisperServer).toHaveBeenCalledOnce();
    expect(saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        sttEngine: DEFAULT_CONFIG.sttEngine,
        whisperServerPort: DEFAULT_CONFIG.whisperServerPort,
        language: DEFAULT_CONFIG.language,
        vadThreshold: DEFAULT_CONFIG.vadThreshold,
        silenceDurationMs: DEFAULT_CONFIG.silenceDurationMs,
        autoSubmit: DEFAULT_CONFIG.autoSubmit,
        audioDeviceIndex: DEFAULT_CONFIG.audioDeviceIndex,
        debug: DEFAULT_CONFIG.debug,
      })
    );
    const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('reset to defaults');
  });
});

// ---------------------------------------------------------------------------
// voice-handler fallback path tests
// ---------------------------------------------------------------------------

describe('voice-handler — whisper-server fallback', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  const SERVER_CONFIG = {
    sttEngine: 'whisper-server' as const,
    language: 'ko',
    modelPath: '/mock/models/ggml-base.bin',
    vadThreshold: 0.02,
    silenceDurationMs: 1500,
    autoSubmit: false,
    audioDeviceIndex: 0,
    whisperServerPort: 18080,
    debug: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    vi.mocked(loadConfig).mockReturnValue({ ...SERVER_CONFIG });
    vi.mocked(isWhisperServerAvailable).mockReturnValue(true);
    vi.mocked(fs.existsSync).mockReturnValue(true);
    // Server is alive so no startWhisperServer needed by default
    vi.mocked(readServerInfo).mockReturnValue({ pid: 1234, port: 18080 });
    vi.mocked(isServerAlive).mockReturnValue(true);
    vi.mocked(transcribeViaServer).mockResolvedValue('transcribed text');
    vi.mocked(isWhisperAvailable).mockReturnValue(true);
  });

  it('outputs error message and returns when whisper-server fails and whisper-cli is not available', async () => {
    // Server not alive → triggers startWhisperServer which fails
    vi.mocked(isServerAlive).mockReturnValue(false);
    vi.mocked(readServerInfo).mockReturnValue(null);
    vi.mocked(startWhisperServer).mockRejectedValue(new Error('spawn failed'));
    // whisper-cli not available
    vi.mocked(isWhisperAvailable).mockReturnValue(false);

    await handleVoice();

    const stderrOutput = stderrSpy.mock.calls.map((c) => c[0]).join('');
    expect(stderrOutput).toContain('whisper-cli also not available');
    expect(stderrOutput).toContain('Cannot transcribe');
  });

  it('falls back to whisper-cli when whisper-server fails and whisper-cli is available', async () => {
    // Server not alive → triggers startWhisperServer which fails
    vi.mocked(isServerAlive).mockReturnValue(false);
    vi.mocked(readServerInfo).mockReturnValue(null);
    vi.mocked(startWhisperServer).mockRejectedValue(new Error('spawn failed'));
    // whisper-cli available
    vi.mocked(isWhisperAvailable).mockReturnValue(true);

    const { transcribe } = await import('../../plugin/src/stt/whisper-engine.js');
    vi.mocked(transcribe).mockReturnValue({ text: 'fallback result', durationMs: 100 });

    await handleVoice();

    const stderrOutput = stderrSpy.mock.calls.map((c) => c[0]).join('');
    expect(stderrOutput).toContain('Falling back to whisper-cli');
    const stdoutOutput = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    expect(stdoutOutput).toContain('fallback result');
  });
});
