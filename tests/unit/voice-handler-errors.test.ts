import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    default: {
      ...actual,
      existsSync: vi.fn(),
      unlinkSync: vi.fn(),
    },
    existsSync: vi.fn(),
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
}));

vi.mock('../../plugin/src/utils/config.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../plugin/src/utils/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import fs from 'fs';
import { captureAudio } from '../../plugin/src/stt/audio-capture.js';
import { captureAudioWithVAD } from '../../plugin/src/vad/silence-vad.js';
import { transcribe, isWhisperAvailable } from '../../plugin/src/stt/whisper-engine.js';
import { detectBinaries } from '../../plugin/src/utils/platform.js';
import { loadConfig } from '../../plugin/src/utils/config.js';
import { handleVoice } from '../../plugin/src/commands/voice-handler.js';

describe('handleVoice error paths', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

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

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    vi.mocked(loadConfig).mockReturnValue({ ...baseConfig });
    // Set up sensible defaults for ALL mocks so that if process.exit() is a no-op
    // and execution continues past an early-exit guard, it doesn't crash.
    vi.mocked(isWhisperAvailable).mockReturnValue(true);
    vi.mocked(detectBinaries).mockReturnValue({ whisperCli: '/usr/bin/whisper-cli', ffmpeg: '/usr/bin/ffmpeg', sox: null, arecord: null });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(captureAudioWithVAD).mockResolvedValue('/tmp/voice-capture-default.wav');
    vi.mocked(transcribe).mockReturnValue({ text: '', durationMs: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exits with 1 when whisper-cli is not available', async () => {
    vi.mocked(isWhisperAvailable).mockReturnValue(false);
    vi.mocked(detectBinaries).mockReturnValue({ whisperCli: null, ffmpeg: '/usr/bin/ffmpeg', sox: null, arecord: null });

    await handleVoice();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('whisper-cli not found');
  });

  it('exits with 1 when ffmpeg is not available', async () => {
    vi.mocked(isWhisperAvailable).mockReturnValue(true);
    vi.mocked(detectBinaries).mockReturnValue({ whisperCli: '/usr/bin/whisper-cli', ffmpeg: null, sox: null, arecord: null });

    await handleVoice();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('ffmpeg not found');
  });

  it('exits with 1 when model file is not found', async () => {
    vi.mocked(isWhisperAvailable).mockReturnValue(true);
    vi.mocked(detectBinaries).mockReturnValue({ whisperCli: '/usr/bin/whisper-cli', ffmpeg: '/usr/bin/ffmpeg', sox: null, arecord: null });
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await handleVoice();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('Whisper model not found');
  });

  it('model not found error includes curl download command', async () => {
    vi.mocked(isWhisperAvailable).mockReturnValue(true);
    vi.mocked(detectBinaries).mockReturnValue({ whisperCli: '/usr/bin/whisper-cli', ffmpeg: '/usr/bin/ffmpeg', sox: null, arecord: null });
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await handleVoice();

    const output = stdoutSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('curl');
  });

  it('exits with 1 on audio capture failure', async () => {
    vi.mocked(isWhisperAvailable).mockReturnValue(true);
    vi.mocked(detectBinaries).mockReturnValue({ whisperCli: '/usr/bin/whisper-cli', ffmpeg: '/usr/bin/ffmpeg', sox: null, arecord: null });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(captureAudioWithVAD).mockRejectedValue(new Error('Microphone access denied'));

    await handleVoice();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = stdoutSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('Audio capture failed');
  });

  it('audio capture failure includes microphone permission hint', async () => {
    vi.mocked(isWhisperAvailable).mockReturnValue(true);
    vi.mocked(detectBinaries).mockReturnValue({ whisperCli: '/usr/bin/whisper-cli', ffmpeg: '/usr/bin/ffmpeg', sox: null, arecord: null });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(captureAudioWithVAD).mockRejectedValue(new Error('error'));

    await handleVoice();

    const output = stdoutSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('microphone');
  });

  it('outputs "(no speech detected)" to stdout when transcription is empty', async () => {
    vi.mocked(isWhisperAvailable).mockReturnValue(true);
    vi.mocked(detectBinaries).mockReturnValue({ whisperCli: '/usr/bin/whisper-cli', ffmpeg: '/usr/bin/ffmpeg', sox: null, arecord: null });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(captureAudioWithVAD).mockResolvedValue('/tmp/voice-capture-1234.wav');
    vi.mocked(transcribe).mockReturnValue({ text: '', durationMs: 100 });

    await handleVoice();

    const output = stdoutSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('(no speech detected)');
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('outputs transcribed text to stdout with trailing newline', async () => {
    vi.mocked(isWhisperAvailable).mockReturnValue(true);
    vi.mocked(detectBinaries).mockReturnValue({ whisperCli: '/usr/bin/whisper-cli', ffmpeg: '/usr/bin/ffmpeg', sox: null, arecord: null });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(captureAudioWithVAD).mockResolvedValue('/tmp/voice-capture-1234.wav');
    vi.mocked(transcribe).mockReturnValue({ text: 'auth.py에서 JWT 처리해줘', durationMs: 150 });

    await handleVoice();

    // stdout should contain the transcribed text
    const output = stdoutSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('auth.py에서 JWT 처리해줘');
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('stdout transcription has no emoji prefix', async () => {
    vi.mocked(isWhisperAvailable).mockReturnValue(true);
    vi.mocked(detectBinaries).mockReturnValue({ whisperCli: '/usr/bin/whisper-cli', ffmpeg: '/usr/bin/ffmpeg', sox: null, arecord: null });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(captureAudioWithVAD).mockResolvedValue('/tmp/voice-capture-1234.wav');
    vi.mocked(transcribe).mockReturnValue({ text: 'hello world', durationMs: 100 });

    await handleVoice();

    // stdout calls - the last call with text should be just the text
    const textCalls = stdoutSpy.mock.calls.filter(c => String(c[0]).includes('hello world'));
    expect(textCalls.length).toBeGreaterThan(0);
    const firstTextOutput = String(textCalls[0][0]);
    // Should not start with emoji
    expect(firstTextOutput.trimStart()).toMatch(/^hello world/);
  });

  it('cleans up temp file after successful transcription', async () => {
    vi.mocked(isWhisperAvailable).mockReturnValue(true);
    vi.mocked(detectBinaries).mockReturnValue({ whisperCli: '/usr/bin/whisper-cli', ffmpeg: '/usr/bin/ffmpeg', sox: null, arecord: null });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const tempPath = '/tmp/voice-capture-1234.wav';
    vi.mocked(captureAudioWithVAD).mockResolvedValue(tempPath);
    vi.mocked(transcribe).mockReturnValue({ text: 'hello', durationMs: 100 });

    await handleVoice();

    expect(fs.unlinkSync).toHaveBeenCalledWith(tempPath);
  });
});
