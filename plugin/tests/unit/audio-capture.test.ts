import { describe, it, expect } from 'vitest';
// Audio capture requires real hardware - just verify the module exports
import { captureAudio } from '../../src/stt/audio-capture.js';

describe('audio-capture', () => {
  it('exports captureAudio function', () => {
    expect(typeof captureAudio).toBe('function');
  });
});
