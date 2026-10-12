import { describe, expect, it } from 'vitest';
import { Channel, sample } from './random';

describe('sample', () => {
  it('gives known outputs for given (seed, layer, channel), so saved seeds keep their look', () => {
    expect(sample(1, 0, Channel.rotation)).toBe(-0.6086927158758044);
    expect(sample(1, 0, Channel.size)).toBe(0.04743567807599902);
    expect(sample(1, 1, Channel.rotation)).toBe(0.2637925180606544);
    expect(sample(42, 3, Channel.offsetY)).toBe(-0.5251609277911484);
    expect(sample(999, 15, Channel.aspect)).toBe(-0.2251961096189916);
  });

  it('keeps the channel keys fixed', () => {
    expect(Channel).toEqual({ rotation: 1, size: 2, aspect: 3, offsetX: 4, offsetY: 5 });
  });

  it('stays in [-1, 1] and averages near zero', () => {
    let sum = 0;
    let count = 0;
    for (let seed = 1; seed <= 200; seed++) {
      for (let layer = 0; layer < 16; layer++) {
        for (const channel of Object.values(Channel)) {
          const u = sample(seed, layer, channel);
          expect(u).toBeGreaterThanOrEqual(-1);
          expect(u).toBeLessThanOrEqual(1);
          sum += u;
          count++;
        }
      }
    }
    expect(Math.abs(sum / count)).toBeLessThan(0.03);
  });

  it('gives different seeds, layers and channels different samples', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) {
      for (let layer = 0; layer < 16; layer++) {
        for (const channel of Object.values(Channel)) seen.add(sample(seed, layer, channel));
      }
    }
    expect(seen.size).toBe(20 * 16 * 5);
  });
});
