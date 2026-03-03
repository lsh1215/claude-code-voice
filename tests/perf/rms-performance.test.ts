import { describe, it, expect } from 'vitest';
import { computeRMS } from '../../plugin/src/vad/silence-vad.js';

describe('computeRMS performance', () => {
  it('1 second audio (32000 bytes at 16kHz mono 16-bit) completes within 5ms', () => {
    // 16kHz * 1s * 2 bytes/sample = 32000 bytes
    const buf = Buffer.alloc(32000, 0);
    // Fill with a test signal
    for (let i = 0; i < 16000; i++) {
      buf.writeInt16LE(Math.round(Math.sin(i / 100) * 16000), i * 2);
    }

    const start = performance.now();
    const result = computeRMS(buf);
    const elapsed = performance.now() - start;

    expect(typeof result).toBe('number');
    expect(elapsed).toBeLessThan(5);
  });

  it('30 seconds audio (960000 bytes) completes within 50ms', () => {
    // 16kHz * 30s * 2 bytes/sample = 960000 bytes
    const buf = Buffer.alloc(960000, 0);
    // Fill with a test signal
    for (let i = 0; i < 480000; i++) {
      buf.writeInt16LE(Math.round(Math.sin(i / 100) * 16000), i * 2);
    }

    const start = performance.now();
    const result = computeRMS(buf);
    const elapsed = performance.now() - start;

    expect(typeof result).toBe('number');
    expect(elapsed).toBeLessThan(50);
  });

  it('empty buffer returns 0 instantly', () => {
    const buf = Buffer.alloc(0);
    const start = performance.now();
    const result = computeRMS(buf);
    const elapsed = performance.now() - start;

    expect(result).toBe(0);
    expect(elapsed).toBeLessThan(1);
  });

  it('result is consistent across multiple calls (deterministic)', () => {
    const buf = Buffer.alloc(1000);
    for (let i = 0; i < 500; i++) {
      buf.writeInt16LE(i % 2 === 0 ? 10000 : -10000, i * 2);
    }

    const r1 = computeRMS(buf);
    const r2 = computeRMS(buf);
    const r3 = computeRMS(buf);

    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
  });
});
