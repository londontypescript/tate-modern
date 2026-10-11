import { describe, expect, it } from 'vitest';
import { defaultLogoConfig } from '../logo';
import { mergeWithDefaults, parsePresets } from './presets';

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
    expect(parsePresets(null)).toEqual([]);
    expect(parsePresets('{not json')).toEqual([]);
    expect(parsePresets('{"a":1}')).toEqual([]);
  });

  it('keeps well-formed presets and drops malformed ones', () => {
    const json = JSON.stringify([
      { id: 'a', name: 'Bold', config: { emblem: { layerCount: 8 } }, savedAt: '2026-10-11T19:00:00Z' },
      { name: 'no id' },
      42,
    ]);
    const presets = parsePresets(json);
    expect(presets).toHaveLength(1);
    expect(presets[0]?.name).toBe('Bold');
    expect(presets[0]?.config.emblem.layerCount).toBe(8);
    expect(presets[0]?.config.wordmark).toEqual(defaultLogoConfig.wordmark);
  });
});
