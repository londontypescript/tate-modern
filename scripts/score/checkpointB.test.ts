import { describe, expect, it } from 'vitest';
import { checkpointB, frozen } from './fixtures';
import { outOfScope } from './scope';

describe("Checkpoint B's candidates", () => {
  it('are eight distinct colourings, every one inside the colour scope', () => {
    expect(checkpointB).toHaveLength(8);
    expect(new Set(checkpointB.map((c) => JSON.stringify(c.config))).size).toBe(8);
    for (const { label, config } of checkpointB) expect(outOfScope(config, frozen), label).toEqual([]);
  });

  it('include the opacity extremes and pale, near-cream and white fades', () => {
    const opacities = checkpointB.map((c) => c.config.emblem.opacity);
    expect(Math.min(...opacities)).toBe(0.1);
    expect(Math.max(...opacities)).toBe(1);
    const fades = checkpointB.map((c) => c.config.emblem.fadeColour);
    expect(fades).toEqual(expect.arrayContaining(['#ffffff', '#f6efe2', '#dff1ff']));
  });
});
