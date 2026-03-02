import { describe, it, expect } from 'vitest';
import { computeRMS, writeWAV } from '../../src/vad/silence-vad.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('computeRMS', () => {
  it('returns 0 for empty buffer', () => {
    expect(computeRMS(Buffer.alloc(0))).toBe(0);
  });

  it('returns ~1.0 for max positive 16-bit signal', () => {
    // 32767 is max positive int16 value → normalized ~1.0
    const buf = Buffer.alloc(4);
    buf.writeInt16LE(32767, 0);
    buf.writeInt16LE(32767, 2);
    const rms = computeRMS(buf);
    // 32767/32768 ≈ 0.99997
    expect(rms).toBeCloseTo(32767 / 32768, 4);
  });

  it('returns ~0.707 for 50% amplitude sine-like signal', () => {
    // Alternating +amplitude and -amplitude → RMS = amplitude/sqrt(2) for a square wave
    // For a signal alternating +23170 and -23170 (≈ 32768*0.707):
    // normalized: ±0.707, RMS = 0.707
    const amplitude = Math.round(32768 * Math.SQRT1_2); // ~23170
    const samples = 100;
    const buf = Buffer.alloc(samples * 2);
    for (let i = 0; i < samples; i++) {
      buf.writeInt16LE(i % 2 === 0 ? amplitude : -amplitude, i * 2);
    }
    const rms = computeRMS(buf);
    expect(rms).toBeCloseTo(Math.SQRT1_2, 2);
  });
});

describe('writeWAV', () => {
  it('writes valid RIFF/WAVE header', () => {
    const pcm = Buffer.from([0x00, 0x01, 0x02, 0x03]); // 4 bytes = 2 samples
    const outPath = path.join(os.tmpdir(), `test-wav-${Date.now()}.wav`);

    try {
      writeWAV(pcm, outPath, 16000);

      const data = fs.readFileSync(outPath);

      // Check RIFF marker
      expect(data.subarray(0, 4).toString('ascii')).toBe('RIFF');
      // Check WAVE marker
      expect(data.subarray(8, 12).toString('ascii')).toBe('WAVE');
      // Check fmt  marker
      expect(data.subarray(12, 16).toString('ascii')).toBe('fmt ');
      // Check PCM format (1)
      expect(data.readUInt16LE(20)).toBe(1);
      // Check mono (1 channel)
      expect(data.readUInt16LE(22)).toBe(1);
      // Check sample rate
      expect(data.readUInt32LE(24)).toBe(16000);
      // Check byte rate (sampleRate * 2)
      expect(data.readUInt32LE(28)).toBe(32000);
      // Check block align (2)
      expect(data.readUInt16LE(32)).toBe(2);
      // Check bits per sample (16)
      expect(data.readUInt16LE(34)).toBe(16);
      // Check data marker
      expect(data.subarray(36, 40).toString('ascii')).toBe('data');
      // Check data size
      expect(data.readUInt32LE(40)).toBe(pcm.length);
      // Check total file size: 44 header + pcm.length
      expect(data.length).toBe(44 + pcm.length);
      // Check chunk size field: 36 + dataSize
      expect(data.readUInt32LE(4)).toBe(36 + pcm.length);
    } finally {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    }
  });

  it('PCM data follows header unchanged', () => {
    const pcm = Buffer.from([0xAB, 0xCD, 0xEF, 0x12, 0x34, 0x56]);
    const outPath = path.join(os.tmpdir(), `test-wav-pcm-${Date.now()}.wav`);

    try {
      writeWAV(pcm, outPath, 44100);

      const data = fs.readFileSync(outPath);

      // Header is 44 bytes, PCM follows
      const writtenPCM = data.subarray(44);
      expect(Buffer.compare(writtenPCM, pcm)).toBe(0);
    } finally {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    }
  });
});
