import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that use those modules.
// ---------------------------------------------------------------------------

vi.mock('../../src/stt/audio-capture.js', () => ({
  captureAudio: vi.fn(),
}));

vi.mock('../../src/vad/silence-vad.js', () => ({
  captureAudioWithVAD: vi.fn(),
  computeRMS: vi.fn(),
  writeWAV: vi.fn(),
}));

vi.mock('../../src/stt/whisper-engine.js', () => ({
  isWhisperAvailable: vi.fn(),
  transcribe: vi.fn(),
}));

vi.mock('../../src/utils/platform.js', () => ({
  detectBinaries: vi.fn(),
  getPlatform: vi.fn(() => 'darwin'),
  getAudioRecorder: vi.fn(() => 'ffmpeg'),
}));

vi.mock('../../src/utils/config.js', () => ({
  loadConfig: vi.fn(() => ({
    sttEngine: 'whisper-cli',
    language: 'ko',
    modelPath: '/tmp/test-model/ggml-base.bin',
    vadThreshold: 0.02,
    silenceDurationMs: 1500,
    autoSubmit: false,
    debug: false,
  })),
}));

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

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { handleVoice } from '../../src/commands/voice-handler.js';
import { isWhisperAvailable, transcribe } from '../../src/stt/whisper-engine.js';
import { captureAudioWithVAD } from '../../src/vad/silence-vad.js';
import { detectBinaries } from '../../src/utils/platform.js';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function captureStdout(): { chunks: string[]; restore: () => string } {
  const chunks: string[] = [];
  const original = process.stdout.write.bind(process.stdout);
  const spy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: unknown) => {
      chunks.push(String(chunk));
      return true;
    });
  return {
    chunks,
    restore: () => {
      spy.mockRestore();
      return chunks.join('');
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Voice flow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default happy-path mock returns
    vi.mocked(isWhisperAvailable).mockReturnValue(true);
    vi.mocked(detectBinaries).mockReturnValue({
      whisperCli: '/usr/local/bin/whisper-cli',
      ffmpeg: '/usr/local/bin/ffmpeg',
      sox: null,
      arecord: null,
    });
    vi.mocked(captureAudioWithVAD).mockResolvedValue('/tmp/voice-vad-test.wav');
    vi.mocked(transcribe).mockReturnValue({
      text: 'auth.py에서 JWT 만료 처리해줘',
      durationMs: 250,
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handleVoice() goes through full pipeline and outputs transcribed text', async () => {
    const { chunks, restore } = captureStdout();

    await handleVoice();

    const output = restore();
    expect(output).toContain('auth.py에서 JWT 만료 처리해줘');
    expect(captureAudioWithVAD).toHaveBeenCalledOnce();
    expect(transcribe).toHaveBeenCalledOnce();
  });

  it('handleVoice() exits with error when whisper-cli not found', async () => {
    vi.mocked(isWhisperAvailable).mockReturnValue(false);

    const { chunks, restore } = captureStdout();
    const mockExit = vi
      .spyOn(process, 'exit')
      .mockImplementation((_code?: string | number | null | undefined) => {
        throw new Error('process.exit called');
      });

    await expect(handleVoice()).rejects.toThrow('process.exit called');

    const output = restore();
    expect(output).toContain('❌ whisper-cli not found');
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });

  it('handleVoice() exits with error when ffmpeg not found', async () => {
    vi.mocked(detectBinaries).mockReturnValue({
      whisperCli: '/usr/local/bin/whisper-cli',
      ffmpeg: null,
      sox: null,
      arecord: null,
    });

    const { chunks, restore } = captureStdout();
    const mockExit = vi
      .spyOn(process, 'exit')
      .mockImplementation((_code?: string | number | null | undefined) => {
        throw new Error('process.exit called');
      });

    await expect(handleVoice()).rejects.toThrow('process.exit called');

    const output = restore();
    expect(output).toContain('❌ ffmpeg not found');
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });

  it('handleVoice() outputs placeholder when no speech detected', async () => {
    vi.mocked(transcribe).mockReturnValue({
      text: '',
      durationMs: 100,
    });

    const { restore } = captureStdout();

    await handleVoice();

    const output = restore();
    expect(output).toContain('(no speech detected)');
  });

  it('handleVoice() cleans up temp audio file after transcription', async () => {
    const { restore } = captureStdout();

    await handleVoice();
    restore();

    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/voice-vad-test.wav');
  });
});
