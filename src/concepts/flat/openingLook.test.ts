import { describe, expect, it } from 'vitest';
import { parsePresets } from '../../studio/presets';
import { defaultLogoConfig } from './engine';
import { fillMissing } from './FlatStudio';
import { flatStarters, irregularSmallerSheets } from './starters';

describe('the flat studio’s opening look', () => {
  const irregular = flatStarters.find((s) => s.name === 'Irregular (14 Oct)');
  const chosen = flatStarters.find((s) => s.name === 'Irregular, 150 (14 Oct)');

  it('is the 14 October irregular sheets with only the square size changed', () => {
    expect(irregular).toBeDefined();
    expect(chosen?.config).toBe(irregularSmallerSheets);
    expect(irregularSmallerSheets.emblem.squareSize).toBe(150);
    expect(irregularSmallerSheets).toEqual({
      ...irregular!.config,
      emblem: { ...irregular!.config.emblem, squareSize: 150 },
    });
  });

  it('leaves the engine defaults, which saved configurations are filled from, unchanged', () => {
    expect(defaultLogoConfig.emblem.squareSize).not.toBe(150);
    const [saved] = parsePresets(
      JSON.stringify([{ id: 'a', name: 'A', config: { emblem: { layerCount: 3 } } }]),
      defaultLogoConfig,
      fillMissing,
    );
    expect(saved?.config.emblem.squareSize).toBe(defaultLogoConfig.emblem.squareSize);
    expect(saved?.config.emblem.opacity).toBe(defaultLogoConfig.emblem.opacity);
  });

  it('lists the renamed and new starters in order', () => {
    expect(flatStarters.map((s) => s.name)).toEqual([
      'Original defaults',
      'MVP (11 Oct)',
      'Irregular (14 Oct)',
      'Irregular, 150 (14 Oct)',
    ]);
  });
});
