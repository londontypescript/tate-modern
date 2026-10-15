import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import type { LogoFonts } from '../../../shared';
import { parsePresets } from '../../../studio/presets';
import { buildLogo, defaultLogoConfig, neutralHalo, neutralVariation, type LogoConfig } from '../engine';
import { flatStarters } from '../starters';
import { renderLogoSvg, svgVariants } from './renderSvg';

/**
 * The fixtures were rendered by the code before sheet variation existed
 * (commit f470180), so these tests prove the variation and halo controls
 * change nothing while they are off. Never regenerate them from newer code.
 * They were written with the fixed id prefix `lts`, before each export took
 * its prefix from its content, so these tests ask for that prefix.
 */
const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');
const savedConfigs = JSON.parse(fixture('configs.json')) as Record<string, unknown>;

let fonts: LogoFonts;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
});

const expectFixtures = (name: string, config: LogoConfig) => {
  const logo = buildLogo(config, fonts);
  for (const variant of svgVariants) {
    expect(renderLogoSvg(variant, logo, { idPrefix: 'lts' }), `${name}.${variant}.svg`).toBe(
      fixture(`${name}.${variant}.svg`),
    );
  }
};

// Later starters turn the variation and the halo on; the MVP must not.
const mvp = flatStarters.find((s) => s.name.startsWith('MVP'))!;

const variationOf = ({ emblem }: LogoConfig) => ({
  rotationJitter: emblem.rotationJitter,
  sizeJitter: emblem.sizeJitter,
  aspectJitter: emblem.aspectJitter,
  offsetJitter: emblem.offsetJitter,
  seed: emblem.seed,
});

describe('output with sheet variation off', () => {
  it('sets the variation explicitly to neutral in the defaults and the MVP starter', () => {
    expect(variationOf(defaultLogoConfig)).toEqual(neutralVariation);
    expect(variationOf(mvp.config)).toEqual(neutralVariation);
  });

  it('renders the approved defaults byte-identically', () => {
    expectFixtures('default', defaultLogoConfig);
  });

  it('renders the MVP starter byte-identically', () => {
    expectFixtures('mvp', mvp.config);
  });

  it('renders configurations saved before variation existed byte-identically, whatever the defaults', () => {
    // Defaults with the variation on, as they may become: older saved
    // configurations still load, through the real path, with it off.
    const defaults: LogoConfig = {
      ...defaultLogoConfig,
      emblem: { ...defaultLogoConfig.emblem, rotationJitter: 6, sizeJitter: 0.1, offsetJitter: 4, seed: 9 },
    };
    const stored = JSON.stringify(Object.entries(savedConfigs).map(([id, config]) => ({ id, name: id, config })));
    const presets = parsePresets(stored, defaults, { emblem: neutralVariation });
    expect(presets).toHaveLength(Object.keys(savedConfigs).length);
    for (const preset of presets) expectFixtures(preset.id, preset.config);
  });

  it('renders identically for every seed while the variation is off', () => {
    for (const seed of [1, 2, 500, 999]) {
      expectFixtures('default', { ...defaultLogoConfig, emblem: { ...defaultLogoConfig.emblem, seed } });
    }
  });
});

describe('output with the halo off', () => {
  const withHalo = (halo: LogoConfig['tile']['halo']): LogoConfig => ({
    ...defaultLogoConfig,
    tile: { ...defaultLogoConfig.tile, halo },
  });

  it('sets the halo explicitly to neutral in the defaults and the MVP starter', () => {
    expect(defaultLogoConfig.tile.halo).toEqual(neutralHalo);
    expect(mvp.config.tile.halo).toEqual(neutralHalo);
  });

  it('renders byte-identically, with bounds unchanged, when the strength is 0 whatever the reach', () => {
    for (const reach of [0.5, 14, 40]) {
      const config = withHalo({ strength: 0, reach, offset: 20 });
      expect(buildLogo(config, fonts).emblem.bounds).toEqual(buildLogo(defaultLogoConfig, fonts).emblem.bounds);
      expectFixtures('default', config);
    }
  });

  it('renders byte-identically, with bounds unchanged, when the reach is 0 whatever the strength', () => {
    for (const strength of [0.01, 0.5, 1]) {
      const config = withHalo({ strength, reach: 0, offset: 20 });
      const logo = buildLogo(config, fonts);
      expect(logo.emblem.halo).toBeUndefined();
      expect(logo.emblem.rotationSafeBounds).toEqual(buildLogo(defaultLogoConfig, fonts).emblem.rotationSafeBounds);
      expectFixtures('default', config);
    }
  });
});
