import { describe, it, expect } from 'vitest';
import { isWhisperAvailable } from '../../plugin/src/stt/whisper-engine.js';

describe('whisper-engine', () => {
  it('isWhisperAvailable returns boolean', () => {
    const result = isWhisperAvailable();
    expect(typeof result).toBe('boolean');
    // On this machine it should be true (whisper-cli is installed)
    expect(result).toBe(true);
  });
});
