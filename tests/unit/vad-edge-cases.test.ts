import { describe, it, expect } from 'vitest';
import { computeRMS } from '../../plugin/src/vad/silence-vad.js';

describe('computeRMS edge cases', () => {
  it('returns 0 for empty buffer (0 bytes)', () => {
    expect(computeRMS(Buffer.alloc(0))).toBe(0);
  });

  it('returns 0 for odd-byte buffer (1 byte, no complete sample)', () => {
    // 1 byte cannot form a complete 16-bit sample → should return 0
    const buf = Buffer.alloc(1);
    buf[0] = 0xFF;
    expect(computeRMS(buf)).toBe(0);
  });

  it('handles odd-byte buffer (3 bytes) using only the complete sample', () => {
    // 3 bytes → 1 complete sample (2 bytes), 1 byte remainder ignored
    const buf = Buffer.alloc(3);
    buf.writeInt16LE(32767, 0); // max positive
    buf[2] = 0xFF; // extra byte, ignored
    const rms = computeRMS(buf);
    // Should equal RMS of single max sample
    expect(rms).toBeCloseTo(32767 / 32768, 4);
  });

  it('returns max signal ~1.0 for clipping (all 32767)', () => {
    const buf = Buffer.alloc(8);
    for (let i = 0; i < 4; i++) buf.writeInt16LE(32767, i * 2);
    expect(computeRMS(buf)).toBeCloseTo(32767 / 32768, 4);
  });

  it('returns ~1.0 for max negative clipping (all -32768)', () => {
    const buf = Buffer.alloc(8);
    for (let i = 0; i < 4; i++) buf.writeInt16LE(-32768, i * 2);
    // -32768/32768 = -1.0, squared = 1.0, RMS = 1.0
    expect(computeRMS(buf)).toBeCloseTo(1.0, 4);
  });

  it('signal just below threshold=0.02 → treated as silence', () => {
    // Create a signal with RMS just below 0.02
    // amplitude = 0.019 * 32768 ≈ 622
    const amplitude = Math.round(0.019 * 32768);
    const buf = Buffer.alloc(200); // 100 samples
    for (let i = 0; i < 100; i++) {
      buf.writeInt16LE(i % 2 === 0 ? amplitude : -amplitude, i * 2);
    }
    const rms = computeRMS(buf);
    expect(rms).toBeLessThan(0.02);
  });

  it('signal just above threshold=0.02 → treated as speech', () => {
    // amplitude = 0.021 * 32768 ≈ 688
    const amplitude = Math.round(0.021 * 32768);
    const buf = Buffer.alloc(200);
    for (let i = 0; i < 100; i++) {
      buf.writeInt16LE(i % 2 === 0 ? amplitude : -amplitude, i * 2);
    }
    const rms = computeRMS(buf);
    expect(rms).toBeGreaterThan(0.02);
  });

  it('DC offset signal (constant positive value)', () => {
    // Constant 16384 → normalized 16384/32768 = 0.5, RMS = 0.5
    const buf = Buffer.alloc(8);
    for (let i = 0; i < 4; i++) buf.writeInt16LE(16384, i * 2);
    expect(computeRMS(buf)).toBeCloseTo(0.5, 4);
  });

  it('all-zero buffer returns exactly 0', () => {
    const buf = Buffer.alloc(100, 0);
    expect(computeRMS(buf)).toBe(0);
  });

  it('single sample buffer returns correct RMS', () => {
    const buf = Buffer.alloc(2);
    buf.writeInt16LE(16384, 0); // 0.5 normalized
    expect(computeRMS(buf)).toBeCloseTo(0.5, 4);
  });
});
