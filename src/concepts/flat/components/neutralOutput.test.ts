import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import type { LogoFonts } from '../../../shared';
import { parsePresets } from '../../../studio/presets';
import { buildLogo, defaultLogoConfig, neutralVariation, type LogoConfig } from '../engine';
import { flatStarters } from '../starters';
import { renderLogoSvg, svgVariants } from './renderSvg';

/**
 * The fixtures were rendered by the code before sheet variation existed
 * (commit f470180), so these tests prove the variation controls change
 * nothing while they are off. Never regenerate them from newer code.
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
    expect(renderLogoSvg(variant, logo), `${name}.${variant}.svg`).toBe(fixture(`${name}.${variant}.svg`));
  }
};

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
    for (const starter of flatStarters) expect(variationOf(starter.config)).toEqual(neutralVariation);
  });

  it('renders the approved defaults byte-identically', () => {
    expectFixtures('default', defaultLogoConfig);
  });

  it('renders the MVP starter byte-identically', () => {
    const mvp = flatStarters.find((s) => s.name.startsWith('MVP'));
    expectFixtures('mvp', mvp!.config);
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
