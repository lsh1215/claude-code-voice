import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

describe('temp file cleanup', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    vi.mocked(loadConfig).mockReturnValue({ ...baseConfig });
    vi.mocked(isWhisperAvailable).mockReturnValue(true);
    vi.mocked(detectBinaries).mockReturnValue({
      whisperCli: '/usr/bin/whisper-cli',
      ffmpeg: '/usr/bin/ffmpeg',
      sox: null,
      arecord: null,
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deletes temp file after successful transcription', async () => {
    const tempPath = '/tmp/voice-capture-1234567890.wav';
    vi.mocked(captureAudioWithVAD).mockResolvedValue(tempPath);
    vi.mocked(transcribe).mockReturnValue({ text: 'hello', durationMs: 100 });

    await handleVoice();

    expect(fs.unlinkSync).toHaveBeenCalledWith(tempPath);
  });

  it('deletes temp file even when transcription throws', async () => {
    const tempPath = '/tmp/voice-capture-error.wav';
    vi.mocked(captureAudioWithVAD).mockResolvedValue(tempPath);
    vi.mocked(transcribe).mockImplementation(() => {
      throw new Error('transcription failed');
    });

    // handleVoice may swallow the error internally and call process.exit
    try {
      await handleVoice();
    } catch {
      // process.exit mock throws — that is expected
    }

    expect(fs.unlinkSync).toHaveBeenCalledWith(tempPath);
  });

  it('does not call unlinkSync when audio capture fails (no temp file created)', async () => {
    vi.mocked(captureAudioWithVAD).mockRejectedValue(
      new Error('Microphone not available'),
    );

    // handleVoice should catch capture failure and call process.exit(1)
    await expect(handleVoice()).rejects.toThrow('process.exit called');

    expect(exitSpy).toHaveBeenCalledWith(1);
    // unlinkSync should NOT have been called since no file was created
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  it('temp file path used for deletion uses voice-capture naming convention', async () => {
    vi.mocked(captureAudioWithVAD).mockResolvedValue(
      '/tmp/voice-capture-1234.wav',
    );
    vi.mocked(transcribe).mockReturnValue({ text: 'test', durationMs: 50 });

    await handleVoice();

    const unlinkCall = vi.mocked(fs.unlinkSync).mock.calls[0]?.[0];
    expect(String(unlinkCall)).toMatch(/voice-capture/);
  });
});
