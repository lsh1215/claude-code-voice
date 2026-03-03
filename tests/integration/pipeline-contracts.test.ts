import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test the output contracts of the voice pipeline:
// - stdout format: transcribed text + single newline
// - stderr format: emoji + status messages
// - exit codes: 0 = success, 1 = failure
// - failure stdout: contains ❌
// - success stdout: pure text only (no emoji)

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      existsSync: vi.fn(() => true),
      unlinkSync: vi.fn(),
    },
    existsSync: vi.fn(() => true),
    unlinkSync: vi.fn(),
  };
});

vi.mock('../../plugin/src/stt/audio-capture.js', () => ({
  captureAudio: vi.fn(),
}));

vi.mock('../../plugin/src/vad/silence-vad.js', () => ({
  captureAudioWithVAD: vi.fn(),
}));

vi.mock('../../plugin/src/stt/whisper-engine.js', () => ({
  transcribe: vi.fn(),
  isWhisperAvailable: vi.fn(),
}));

vi.mock('../../plugin/src/utils/platform.js', () => ({
  detectBinaries: vi.fn(),
  getPlatform: vi.fn(() => 'darwin'),
  getAudioRecorder: vi.fn(() => 'ffmpeg'),
}));

vi.mock('../../plugin/src/utils/config.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../plugin/src/utils/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import fs from 'fs';
import { captureAudioWithVAD } from '../../plugin/src/vad/silence-vad.js';
import { transcribe, isWhisperAvailable } from '../../plugin/src/stt/whisper-engine.js';
import { detectBinaries } from '../../plugin/src/utils/platform.js';
import { loadConfig } from '../../plugin/src/utils/config.js';
import { handleVoice } from '../../plugin/src/commands/voice-handler.js';

const baseConfig = {
  sttEngine: 'whisper-cli' as const,
  language: 'ko',
  modelPath: '/mock/model.bin',
  vadThreshold: 0.02,
  silenceDurationMs: 1500,
  autoSubmit: false,
  audioDeviceIndex: 0,
  debug: false,
};

function setupHappyPath(transcribedText: string) {
  vi.mocked(isWhisperAvailable).mockReturnValue(true);
  vi.mocked(detectBinaries).mockReturnValue({
    whisperCli: '/usr/bin/whisper-cli',
    ffmpeg: '/usr/bin/ffmpeg',
    sox: null,
    arecord: null,
  });
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(captureAudioWithVAD).mockResolvedValue('/tmp/voice-capture-test.wav');
  vi.mocked(transcribe).mockReturnValue({ text: transcribedText, durationMs: 100 });
  vi.mocked(loadConfig).mockReturnValue({ ...baseConfig });
}

describe('pipeline output contracts', () => {
  let stdoutCalls: string[];
  let stderrCalls: string[];
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stdoutCalls = [];
    stderrCalls = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((s) => {
      stdoutCalls.push(String(s));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((s) => {
      stderrCalls.push(String(s));
      return true;
    });
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successful transcription: stdout contains text + newline', async () => {
    setupHappyPath('hello from voice');
    await handleVoice();

    const stdout = stdoutCalls.join('');
    expect(stdout).toContain('hello from voice');
  });

  it('successful transcription: stdout text line has no leading emoji', async () => {
    setupHappyPath('hello from voice');
    await handleVoice();

    const textLine = stdoutCalls.find((s) => s.includes('hello from voice'));
    expect(textLine).toBeDefined();
    expect(textLine!.trim()).toBe('hello from voice');
  });

  it('stderr contains listening message with 🎤 emoji', async () => {
    setupHappyPath('test');
    await handleVoice();

    const stderr = stderrCalls.join('');
    expect(stderr).toContain('🎤');
    expect(stderr.toLowerCase()).toContain('listening');
  });

  it('stderr contains transcribing indicator (⏳)', async () => {
    setupHappyPath('test');
    await handleVoice();

    const stderr = stderrCalls.join('');
    expect(stderr).toContain('⏳');
  });

  it('failure: process.exit(1) called when whisper-cli not found', async () => {
    vi.mocked(isWhisperAvailable).mockReturnValue(false);
    vi.mocked(detectBinaries).mockReturnValue({
      whisperCli: null,
      ffmpeg: null,
      sox: null,
      arecord: null,
    });
    vi.mocked(loadConfig).mockReturnValue({ ...baseConfig });

    await expect(handleVoice()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('failure: stdout contains ❌ when whisper-cli not found', async () => {
    vi.mocked(isWhisperAvailable).mockReturnValue(false);
    vi.mocked(detectBinaries).mockReturnValue({
      whisperCli: null,
      ffmpeg: null,
      sox: null,
      arecord: null,
    });
    vi.mocked(loadConfig).mockReturnValue({ ...baseConfig });

    await expect(handleVoice()).rejects.toThrow('process.exit called');

    const stdout = stdoutCalls.join('');
    expect(stdout).toContain('❌');
  });

  it('success: process.exit not called', async () => {
    setupHappyPath('good input');
    await handleVoice();

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('no speech detected: stdout contains "(no speech detected)"', async () => {
    setupHappyPath('');
    await handleVoice();

    const stdout = stdoutCalls.join('');
    expect(stdout).toContain('(no speech detected)');
  });
});
