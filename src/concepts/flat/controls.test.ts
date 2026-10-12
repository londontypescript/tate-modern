import { describe, expect, it } from 'vitest';
import { controlGroups } from './controls';
import { defaultLogoConfig, haloRanges } from './engine';

describe('the Halo controls', () => {
  const titles = controlGroups.map((g) => g.title);
  const group = controlGroups.find((g) => g.title === 'Halo');

  it('come right after the sheet variation', () => {
    expect(titles.indexOf('Halo')).toBe(titles.indexOf('Sheet variation') + 1);
  });

  it('read and write the tile’s halo, within its ranges', () => {
    const expected = [
      ['Halo strength', 'strength', 0.01],
      ['Halo reach', 'reach', 0.5],
      ['Shadow offset', 'offset', 0.5],
    ] as const;
    expect(group?.controls.map((c) => c.label)).toEqual(expected.map(([label]) => label));
    for (const [label, key, step] of expected) {
      const control = group!.controls.find((c) => c.label === label)!;
      expect([control.min, control.max, control.step]).toEqual([haloRanges[key].min, haloRanges[key].max, step]);
      expect(control.get(defaultLogoConfig)).toBe(defaultLogoConfig.tile.halo[key]);
      const changed = control.set(defaultLogoConfig, 7);
      expect(changed.tile.halo).toEqual({ ...defaultLogoConfig.tile.halo, [key]: 7 });
      expect({ ...changed.tile, halo: undefined }).toEqual({ ...defaultLogoConfig.tile, halo: undefined });
      expect(changed.emblem).toBe(defaultLogoConfig.emblem);
    }
  });
});
