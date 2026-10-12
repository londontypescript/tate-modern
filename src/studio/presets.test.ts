import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { defaultLogoConfig, neutralVariation, type LogoConfig } from '../concepts/flat/engine';
import { mergeWithDefaults, parsePresets, usePresets, type Preset } from './presets';

describe('mergeWithDefaults', () => {
  it('keeps saved values and fills in fields added since', () => {
    const saved = { emblem: { layerCount: 9 }, layout: { horizontalGap: 0.3 } };
    const merged = mergeWithDefaults(defaultLogoConfig, saved);
    expect(merged.emblem.layerCount).toBe(9);
    expect(merged.layout.horizontalGap).toBe(0.3);
    expect(merged.emblem.squareSize).toBe(defaultLogoConfig.emblem.squareSize);
    expect(merged.tile).toEqual(defaultLogoConfig.tile);
  });

  it('ignores values of the wrong type', () => {
    const merged = mergeWithDefaults(defaultLogoConfig, { emblem: { opacity: 'lots', colours: 'blue' } });
    expect(merged.emblem.opacity).toBe(defaultLogoConfig.emblem.opacity);
    expect(merged.emblem.colours).toEqual(defaultLogoConfig.emblem.colours);
  });

  it('round-trips a full config unchanged', () => {
    expect(mergeWithDefaults(defaultLogoConfig, JSON.parse(JSON.stringify(defaultLogoConfig)))).toEqual(
      defaultLogoConfig,
    );
  });
});

describe('parsePresets', () => {
  it('returns nothing for missing or corrupt storage', () => {
    expect(parsePresets(null, defaultLogoConfig)).toEqual([]);
    expect(parsePresets('{not json', defaultLogoConfig)).toEqual([]);
    expect(parsePresets('{"a":1}', defaultLogoConfig)).toEqual([]);
  });

  it('keeps well-formed presets and drops malformed ones', () => {
    const json = JSON.stringify([
      { id: 'a', name: 'Bold', config: { emblem: { layerCount: 8 } }, savedAt: '2026-10-11T19:00:00Z' },
      { name: 'no id' },
      42,
    ]);
    const presets = parsePresets(json, defaultLogoConfig);
    expect(presets).toHaveLength(1);
    expect(presets[0]?.name).toBe('Bold');
    expect(presets[0]?.config.emblem.layerCount).toBe(8);
    expect(presets[0]?.config.wordmark).toEqual(defaultLogoConfig.wordmark);
  });
});

describe('filling fields older saved configurations lack', () => {
  // Deliberately non-neutral defaults, as they may become: older saved
  // configurations must still load with the variation off.
  const defaults: LogoConfig = {
    ...defaultLogoConfig,
    emblem: {
      ...defaultLogoConfig.emblem,
      rotationJitter: 9,
      sizeJitter: 0.2,
      aspectJitter: 0.15,
      offsetJitter: 7,
      seed: 77,
    },
  };
  const missing = { emblem: neutralVariation };
  const variationOf = (c: LogoConfig) => {
    const { rotationJitter, sizeJitter, aspectJitter, offsetJitter, seed } = c.emblem;
    return { rotationJitter, sizeJitter, aspectJitter, offsetJitter, seed };
  };
  const stored = JSON.stringify([
    { id: 'old', name: 'Old', config: { emblem: { layerCount: 9 }, layout: { horizontalGap: 0.3 } } },
    { id: 'new', name: 'New', config: { emblem: { rotationJitter: 4, seed: 12 } } },
    { id: 'bare', name: 'No emblem', config: { layout: { horizontalGap: 0.2 } } },
    { id: 'odd', name: 'Emblem not an object', config: { emblem: 5 } },
  ]);

  /** Loads through `usePresets`, as the presets panel does, from a fake localStorage. */
  function loadWithHook(): Preset<LogoConfig>[] {
    let loaded: Preset<LogoConfig>[] = [];
    function Probe() {
      loaded = usePresets('key', defaults, missing).presets;
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
    ['parsePresets', () => parsePresets(stored, defaults, missing)],
    ['usePresets', loadWithHook],
  ] as const;

  for (const [path, load] of paths) {
    const configs = () => load().map((p) => p.config);

    it(`gives missing variation fields their neutral values, through ${path}`, () => {
      const [old, , bare, odd] = configs();
      expect(configs()).toHaveLength(4);
      for (const config of [old, bare, odd]) expect(variationOf(config as LogoConfig)).toEqual(neutralVariation);
    });

    it(`keeps saved variation values, through ${path}`, () => {
      const saved = configs()[1] as LogoConfig;
      expect(variationOf(saved)).toEqual({ ...neutralVariation, rotationJitter: 4, seed: 12 });
    });

    it(`still gives other missing fields their ordinary defaults, through ${path}`, () => {
      const [old, , bare] = configs() as [LogoConfig, LogoConfig, LogoConfig];
      expect(old.emblem.layerCount).toBe(9);
      expect(old.emblem.squareSize).toBe(defaults.emblem.squareSize);
      expect(old.tile).toEqual(defaults.tile);
      expect(bare.layout.horizontalGap).toBe(0.2);
      expect(bare.emblem.squareSize).toBe(defaults.emblem.squareSize);
      expect(bare.emblem.colours).toEqual(defaults.emblem.colours);
    });
  }

  it('leaves other concepts, which pass nothing to fill, as before', () => {
    const merged = mergeWithDefaults(defaults, { emblem: { layerCount: 3 } });
    expect(variationOf(merged)).toEqual(variationOf(defaults));
    expect(mergeWithDefaults(defaults, 'nonsense')).toBe(defaults);
  });
});
