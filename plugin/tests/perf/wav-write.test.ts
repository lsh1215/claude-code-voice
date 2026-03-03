import { describe, it, expect } from 'vitest';
import { writeWAV } from '../../src/vad/silence-vad.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('writeWAV performance', () => {
  it('30 seconds PCM (960000 bytes) writes within 100ms', () => {
    const pcm = Buffer.alloc(960000);
    // Fill with test data
    for (let i = 0; i < 480000; i++) {
      pcm.writeInt16LE(i % 32767, i * 2);
    }

    const outPath = path.join(os.tmpdir(), `perf-wav-test-${Date.now()}.wav`);

    try {
      const start = performance.now();
      writeWAV(pcm, outPath, 16000);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);

      // Verify file was actually written
      expect(fs.existsSync(outPath)).toBe(true);
      const stat = fs.statSync(outPath);
      expect(stat.size).toBe(960000 + 44); // PCM + WAV header
    } finally {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    }
  });

  it('empty PCM writes within 5ms', () => {
    const pcm = Buffer.alloc(0);
    const outPath = path.join(os.tmpdir(), `perf-wav-empty-${Date.now()}.wav`);

    try {
      const start = performance.now();
      writeWAV(pcm, outPath, 16000);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5);
      expect(fs.existsSync(outPath)).toBe(true);
    } finally {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    }
  });

  it('1 second PCM (32000 bytes) writes within 10ms', () => {
    const pcm = Buffer.alloc(32000);
    const outPath = path.join(os.tmpdir(), `perf-wav-1s-${Date.now()}.wav`);

    try {
      const start = performance.now();
      writeWAV(pcm, outPath, 16000);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
    } finally {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    }
  });
});
