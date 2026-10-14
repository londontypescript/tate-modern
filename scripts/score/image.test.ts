import { describe, expect, it } from 'vitest';
import { decodePng, encodePng, fromRgba, type RgbImage } from './image';

const tiny: RgbImage = { width: 2, height: 1, data: Uint8Array.from([255, 0, 0, 0, 0, 255]) };

describe('PNG images', () => {
  it('round-trips an opaque image through PNG', () => {
    expect(decodePng(encodePng(tiny))).toEqual(tiny);
  });

  it('refuses an image that isn’t opaque everywhere', () => {
    expect(() => fromRgba(1, 1, Uint8Array.from([1, 2, 3, 254]), 'test')).toThrow(/test: pixel \(0, 0\) has alpha 254/);
  });

  it('refuses pixel data of the wrong length', () => {
    expect(() => fromRgba(2, 2, new Uint8Array(4), 'test')).toThrow(/test: expected 16 bytes for 2 × 2, got 4/);
  });

  it('checks the decoded size when asked to', () => {
    expect(() => decodePng(encodePng(tiny), { width: 3, height: 1 })).toThrow(/expected 3 × 1, got 2 × 1/);
  });
});
