import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import type { LogoFonts } from '../../../shared';
import { parsePresets } from '../../../studio/presets';
import { buildLogo, neutralHalo, neutralVariation, type LogoConfig } from '../engine';
import { defaults12October } from '../frozenLooks';
import { flatStarters } from '../starters';
import { renderLogoSvg, svgVariants } from './renderSvg';

/**
 * The fixtures were rendered by the code before sheet variation existed
 * (commit f470180), so these tests prove the variation and halo controls
 * change nothing while they are off. Never regenerate them from newer code.
 * They were written with the fixed id prefix `lts`, before each export took
 * its prefix from its content, so these tests ask for that prefix. The
 * `default` fixtures are the 12 October defaults, so they are compared with
 * the frozen copy of those, never with the engine's current defaults.
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
  it('sets the variation explicitly to neutral in the 12 October defaults and the MVP starter', () => {
    expect(variationOf(defaults12October)).toEqual(neutralVariation);
    expect(variationOf(mvp.config)).toEqual(neutralVariation);
  });

  it('renders the 12 October defaults byte-identically', () => {
    expectFixtures('default', defaults12October);
  });

  it('renders the MVP starter byte-identically', () => {
    expectFixtures('mvp', mvp.config);
  });

  it('renders configurations saved before variation existed byte-identically, whatever the defaults', () => {
    // Defaults with the variation on, as they may become: older saved
    // configurations still load, through the real path, with it off.
    const defaults: LogoConfig = {
      ...defaults12October,
      emblem: { ...defaults12October.emblem, rotationJitter: 6, sizeJitter: 0.1, offsetJitter: 4, seed: 9 },
    };
    const stored = JSON.stringify(Object.entries(savedConfigs).map(([id, config]) => ({ id, name: id, config })));
    const presets = parsePresets(stored, defaults, { emblem: neutralVariation });
    expect(presets).toHaveLength(Object.keys(savedConfigs).length);
    for (const preset of presets) expectFixtures(preset.id, preset.config);
  });

  it('renders identically for every seed while the variation is off', () => {
    for (const seed of [1, 2, 500, 999]) {
      expectFixtures('default', { ...defaults12October, emblem: { ...defaults12October.emblem, seed } });
    }
  });
});

describe('output of the 14 October starters', () => {
  /*
   * The `irregular` and `irregular-150` fixtures were rendered by the code at
   * commit 35261a7, before the defaults changed, from these two starters as
   * they were built then (spread from the defaults). They pin how the looks
   * the maintainer chose from drew at the time, so never regenerate them.
   */
  const starter = (name: string) => flatStarters.find((s) => s.name === name)!.config;

  it('renders Irregular (14 Oct) byte-identically', () => {
    expectFixtures('irregular', starter('Irregular (14 Oct)'));
  });

  it('renders Irregular, 150 (14 Oct) byte-identically', () => {
    expectFixtures('irregular-150', starter('Irregular, 150 (14 Oct)'));
  });
});

describe('output of the chosen look with the variation and halo off', () => {
  /*
   * The `plain` fixtures were rendered by the code at commit 52a63ff, on
   * 25 October 2026, from `Irregular, 150 (14 Oct)` with `neutralVariation`
   * and `neutralHalo` applied. They pin what that look draws with both
   * switched off, so never regenerate them.
   */
  it('renders byte-identically', () => {
    const chosen = flatStarters.find((s) => s.name === 'Irregular, 150 (14 Oct)')!.config;
    expectFixtures('plain', {
      ...chosen,
      emblem: { ...chosen.emblem, ...neutralVariation },
      tile: { ...chosen.tile, halo: neutralHalo },
    });
  });
});

describe('output with the halo off', () => {
  const withHalo = (halo: LogoConfig['tile']['halo']): LogoConfig => ({
    ...defaults12October,
    tile: { ...defaults12October.tile, halo },
  });

  it('sets the halo explicitly to neutral in the 12 October defaults and the MVP starter', () => {
    expect(defaults12October.tile.halo).toEqual(neutralHalo);
    expect(mvp.config.tile.halo).toEqual(neutralHalo);
  });

  it('renders byte-identically, with bounds unchanged, when the strength is 0 whatever the reach', () => {
    for (const reach of [0.5, 14, 40]) {
      const config = withHalo({ strength: 0, reach, offset: 20 });
      expect(buildLogo(config, fonts).emblem.bounds).toEqual(buildLogo(defaults12October, fonts).emblem.bounds);
      expectFixtures('default', config);
    }
  });

  it('renders byte-identically, with bounds unchanged, when the reach is 0 whatever the strength', () => {
    for (const strength of [0.01, 0.5, 1]) {
      const config = withHalo({ strength, reach: 0, offset: 20 });
      const logo = buildLogo(config, fonts);
      expect(logo.emblem.halo).toBeUndefined();
      expect(logo.emblem.rotationSafeBounds).toEqual(buildLogo(defaults12October, fonts).emblem.rotationSafeBounds);
      expectFixtures('default', config);
    }
  });
});
