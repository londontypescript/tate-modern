import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import type { LogoFonts } from '../../../shared';
import { mergeWithDefaults } from '../../../studio/presets';
import { buildLogo, defaultLogoConfig, type LogoConfig } from '../engine';
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

describe('output with sheet variation off', () => {
  it('renders the approved defaults byte-identically', () => {
    expectFixtures('default', defaultLogoConfig);
  });

  it('renders the MVP starter byte-identically', () => {
    const mvp = flatStarters.find((s) => s.name.startsWith('MVP'));
    expectFixtures('mvp', mvp!.config);
  });

  it('renders configurations saved before variation existed byte-identically', () => {
    for (const [name, saved] of Object.entries(savedConfigs)) {
      expectFixtures(name, mergeWithDefaults(defaultLogoConfig, saved));
    }
  });
});
