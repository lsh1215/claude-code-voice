import { describe, it, expect } from 'vitest';
import { writeWAV } from '../../src/vad/silence-vad.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

function writeTempWAV(pcm: Buffer, sampleRate: number): { data: Buffer; cleanup: () => void } {
  const outPath = path.join(os.tmpdir(), `wav-format-test-${Date.now()}-${Math.random()}.wav`);
  writeWAV(pcm, outPath, sampleRate);
  const data = fs.readFileSync(outPath);
  return { data, cleanup: () => { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } };
}

describe('WAV file format', () => {
  it('header is exactly 44 bytes', () => {
    const pcm = Buffer.alloc(4);
    const { data, cleanup } = writeTempWAV(pcm, 16000);
    try {
      expect(data.length).toBe(44 + pcm.length);
    } finally { cleanup(); }
  });

  it('RIFF magic bytes at offset 0', () => {
    const pcm = Buffer.alloc(4);
    const { data, cleanup } = writeTempWAV(pcm, 16000);
    try {
      expect(data.subarray(0, 4).toString('ascii')).toBe('RIFF');
    } finally { cleanup(); }
  });

  it('WAVE magic bytes at offset 8', () => {
    const pcm = Buffer.alloc(4);
    const { data, cleanup } = writeTempWAV(pcm, 16000);
    try {
      expect(data.subarray(8, 12).toString('ascii')).toBe('WAVE');
    } finally { cleanup(); }
  });

  it('fmt  chunk marker at offset 12', () => {
    const pcm = Buffer.alloc(4);
    const { data, cleanup } = writeTempWAV(pcm, 16000);
    try {
      expect(data.subarray(12, 16).toString('ascii')).toBe('fmt ');
    } finally { cleanup(); }
  });

  it('data chunk marker at offset 36', () => {
    const pcm = Buffer.alloc(4);
    const { data, cleanup } = writeTempWAV(pcm, 16000);
    try {
      expect(data.subarray(36, 40).toString('ascii')).toBe('data');
    } finally { cleanup(); }
  });

  it('chunk size = 36 + dataSize (little-endian at offset 4)', () => {
    const pcm = Buffer.alloc(100);
    const { data, cleanup } = writeTempWAV(pcm, 16000);
    try {
      expect(data.readUInt32LE(4)).toBe(36 + pcm.length);
    } finally { cleanup(); }
  });

  it('sampleRate 16000 encoded correctly (little-endian at offset 24)', () => {
    const pcm = Buffer.alloc(4);
    const { data, cleanup } = writeTempWAV(pcm, 16000);
    try {
      expect(data.readUInt32LE(24)).toBe(16000);
    } finally { cleanup(); }
  });

  it('byteRate = sampleRate * 2 for 16-bit mono', () => {
    const pcm = Buffer.alloc(4);
    const { data, cleanup } = writeTempWAV(pcm, 16000);
    try {
      expect(data.readUInt32LE(28)).toBe(16000 * 2);
    } finally { cleanup(); }
  });

  it('blockAlign = 2 (16-bit mono)', () => {
    const pcm = Buffer.alloc(4);
    const { data, cleanup } = writeTempWAV(pcm, 16000);
    try {
      expect(data.readUInt16LE(32)).toBe(2);
    } finally { cleanup(); }
  });

  it('bitsPerSample = 16', () => {
    const pcm = Buffer.alloc(4);
    const { data, cleanup } = writeTempWAV(pcm, 16000);
    try {
      expect(data.readUInt16LE(34)).toBe(16);
    } finally { cleanup(); }
  });

  it('data chunk size matches PCM length', () => {
    const pcm = Buffer.alloc(200);
    const { data, cleanup } = writeTempWAV(pcm, 16000);
    try {
      expect(data.readUInt32LE(40)).toBe(pcm.length);
    } finally { cleanup(); }
  });

  it('PCM format = 1 (linear PCM, not compressed)', () => {
    const pcm = Buffer.alloc(4);
    const { data, cleanup } = writeTempWAV(pcm, 16000);
    try {
      expect(data.readUInt16LE(20)).toBe(1);
    } finally { cleanup(); }
  });

  it('mono channel (1 channel) at offset 22', () => {
    const pcm = Buffer.alloc(4);
    const { data, cleanup } = writeTempWAV(pcm, 16000);
    try {
      expect(data.readUInt16LE(22)).toBe(1);
    } finally { cleanup(); }
  });

  it('sampleRate 8000 encoded correctly', () => {
    const pcm = Buffer.alloc(4);
    const { data, cleanup } = writeTempWAV(pcm, 8000);
    try {
      expect(data.readUInt32LE(24)).toBe(8000);
      expect(data.readUInt32LE(28)).toBe(8000 * 2);
    } finally { cleanup(); }
  });

  it('sampleRate 44100 encoded correctly', () => {
    const pcm = Buffer.alloc(4);
    const { data, cleanup } = writeTempWAV(pcm, 44100);
    try {
      expect(data.readUInt32LE(24)).toBe(44100);
      expect(data.readUInt32LE(28)).toBe(44100 * 2);
    } finally { cleanup(); }
  });
});
