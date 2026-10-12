import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parsePresets, usePresets, type Preset } from '../../studio/presets';
import { defaultLogoConfig, neutralHalo, neutralVariation, type LogoConfig } from './engine';
import { fillMissing } from './FlatStudio';

describe('saved configurations and the halo, through the flat studio’s loading path', () => {
  // Defaults with the halo on, as they may become: older saved
  // configurations must still load with it off.
  const defaults: LogoConfig = {
    ...defaultLogoConfig,
    tile: { ...defaultLogoConfig.tile, halo: { strength: 0.9, reach: 30, offset: 12 } },
  };
  const stored = JSON.stringify([
    { id: 'old', name: 'Old', config: { tile: { textScale: 0.3 }, layout: { horizontalGap: 0.3 } } },
    { id: 'saved', name: 'Saved', config: { tile: { halo: { strength: 0.6, reach: 10, offset: 4 } } } },
    { id: 'bare', name: 'No tile', config: { emblem: { layerCount: 9 } } },
    { id: 'part', name: 'Part of a halo', config: { tile: { halo: { strength: 0.4 } } } },
  ]);

  /** Loads through `usePresets`, as the presets panel does, from a fake localStorage. */
  function loadWithHook(): Preset<LogoConfig>[] {
    let loaded: Preset<LogoConfig>[] = [];
    function Probe() {
      loaded = usePresets('key', defaults, fillMissing).presets;
      return null;
    }
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => (key === 'key' ? stored : null) } });
    try {
      renderToStaticMarkup(createElement(Probe));
    } finally {
      vi.unstubAllGlobals();
    }
    return loaded;
  }

  const paths = [
    ['parsePresets', () => parsePresets(stored, defaults, fillMissing)],
    ['usePresets', loadWithHook],
  ] as const;

  for (const [path, load] of paths) {
    const configs = () => load().map((p) => p.config) as [LogoConfig, LogoConfig, LogoConfig, LogoConfig];

    it(`loads a configuration saved without a halo with the halo off, through ${path}`, () => {
      const [old, , bare, part] = configs();
      expect(old.tile.halo).toEqual(neutralHalo);
      expect(bare.tile.halo).toEqual(neutralHalo);
      expect(part.tile.halo).toEqual({ ...neutralHalo, strength: 0.4 });
    });

    it(`keeps saved halo values, through ${path}`, () => {
      expect(configs()[1].tile.halo).toEqual({ strength: 0.6, reach: 10, offset: 4 });
    });

    it(`still gives other missing fields their ordinary defaults, through ${path}`, () => {
      const [old, saved, bare] = configs();
      expect(old.tile.textScale).toBe(0.3);
      expect(old.tile.size).toBe(defaults.tile.size);
      expect(saved.tile.facets).toEqual(defaults.tile.facets);
      expect(bare.emblem.layerCount).toBe(9);
      expect(bare.emblem.squareSize).toBe(defaults.emblem.squareSize);
      expect(bare.layout).toEqual(defaults.layout);
      expect(old.emblem.seed).toBe(neutralVariation.seed);
    });
  }
});
