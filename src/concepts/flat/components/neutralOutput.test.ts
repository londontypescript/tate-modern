import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import type { Box, LogoFonts } from '../../../shared';
import { parsePresets } from '../../../studio/presets';
import { buildLogo, defaultLogoConfig, neutralHalo, neutralVariation, type LogoConfig } from '../engine';
import { fillMissing } from '../FlatStudio';
import { renderLogoSvg, svgVariants } from './renderSvg';
import { elements } from './svgParse';

/*
 * Two sets of fixtures pin what the flat logo draws. Both were rendered by
 * earlier code with the fixed id prefix `lts`, so these tests ask for that
 * prefix, and neither is ever regenerated:
 *
 * - `irregular-150.*`, rendered at commit 35261a7 (14 October 2026) from
 *   the starter that became the defaults, field for field, on 25 October
 *   2026. They pin the defaults' output.
 * - `plain.*`, rendered at commit 52a63ff (25 October 2026) from the same
 *   look with `neutralVariation` and `neutralHalo` applied. They pin what
 *   it draws with the sheet variation and the halo both switched off.
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

/** Today's look with the variation and the halo switched off, as the `plain` fixtures draw it. */
const plain: LogoConfig = {
  ...defaultLogoConfig,
  emblem: { ...defaultLogoConfig.emblem, ...neutralVariation },
  tile: { ...defaultLogoConfig.tile, halo: neutralHalo },
};

const variationOf = ({ emblem }: LogoConfig) => ({
  rotationJitter: emblem.rotationJitter,
  sizeJitter: emblem.sizeJitter,
  aspectJitter: emblem.aspectJitter,
  offsetJitter: emblem.offsetJitter,
  seed: emblem.seed,
});

/** As the renderer writes a number. */
const written = (v: number) => Number(v.toFixed(3));
const DEG = Math.PI / 180;

/**
 * Each even sheet's side, from the configuration alone: the square size,
 * tapered linearly from the back sheet to the front one.
 */
const evenSides = ({ emblem }: LogoConfig) =>
  Array.from(
    { length: emblem.layerCount },
    (_, i) => emblem.squareSize * (1 - emblem.sizeTaper * (emblem.layerCount > 1 ? i / (emblem.layerCount - 1) : 0)),
  );
const evenRotations = ({ emblem }: LogoConfig) =>
  Array.from({ length: emblem.layerCount }, (_, i) => emblem.initialRotation + i * emblem.rotationIncrement);

/** The bounds of the even sheets and the tile, worked out from the configuration, centred on the origin. */
function evenBounds(config: LogoConfig, framing: 'tight' | 'rotation-safe'): Box {
  const rotations = evenRotations(config);
  let half = config.tile.size / 2;
  evenSides(config).forEach((side, i) => {
    const r = Math.min(config.emblem.cornerRadius, side / 2);
    const straight = side / 2 - r;
    const theta = (rotations[i] ?? NaN) * DEG;
    const reach =
      framing === 'tight'
        ? straight * (Math.abs(Math.cos(theta)) + Math.abs(Math.sin(theta))) + r
        : straight * Math.SQRT2 + r;
    half = Math.max(half, reach);
  });
  return { minX: -half, minY: -half, maxX: half, maxY: half };
}

const expectBox = (actual: Box, expected: Box, label: string) => {
  for (const key of ['minX', 'minY', 'maxX', 'maxY'] as const) {
    expect(actual[key], `${label} ${key}`).toBeCloseTo(expected[key], 9);
  }
};

describe('the defaults’ output', () => {
  it('renders byte-identically to the fixtures rendered from the look before it became the defaults', () => {
    expectFixtures('irregular-150', defaultLogoConfig);
  });
});

describe('output with sheet variation off', () => {
  it('renders today’s look byte-identically for every seed', () => {
    for (const seed of [1, 2, 500, 999]) {
      expectFixtures('plain', { ...plain, emblem: { ...plain.emblem, seed } });
    }
  });

  it('writes each sheet as the even rosette’s square, worked out from the configuration alone', () => {
    for (const sizeTaper of [plain.emblem.sizeTaper, 0.25, -0.3]) {
      for (const seed of [1, 999]) {
        const config: LogoConfig = { ...plain, emblem: { ...plain.emblem, sizeTaper, seed } };
        const sheets = elements(renderLogoSvg('mark', buildLogo(config, fonts), { idPrefix: 'lts' }), 'rect').filter(
          (r) => r.id?.startsWith('lts-layer-'),
        );
        const sides = evenSides(config);
        const rotations = evenRotations(config);
        expect(sheets).toHaveLength(config.emblem.layerCount);
        sheets.forEach((sheet, i) => {
          const where = `taper ${sizeTaper} seed ${seed} ${sheet.id}`;
          const side = String(written(sides[i] ?? NaN));
          expect([sheet.width, sheet.height], where).toEqual([side, side]);
          // Turned about the origin only: no translate.
          expect(sheet.transform, where).toBe(`rotate(${written(rotations[i] ?? NaN)})`);
        });
      }
    }
  });
});

describe('output with the halo off', () => {
  const withHalo = (halo: LogoConfig['tile']['halo']): LogoConfig => ({
    ...plain,
    tile: { ...plain.tile, halo },
  });

  const expectNoHalo = (config: LogoConfig, label: string) => {
    const logo = buildLogo(config, fonts);
    expect(logo.emblem.halo, label).toBeUndefined();
    for (const variant of svgVariants) {
      const svg = renderLogoSvg(variant, logo, { idPrefix: 'lts' });
      expect(svg, `${label} ${variant}`).not.toMatch(/halo|<mask|<radialGradient/);
    }
    expectBox(logo.emblem.bounds, evenBounds(config, 'tight'), `${label} bounds`);
    expectBox(logo.emblem.rotationSafeBounds, evenBounds(config, 'rotation-safe'), `${label} rotation-safe bounds`);
    expectFixtures('plain', config);
  };

  it('draws nothing of it, and frames only the sheets and tile, when the strength is 0 whatever the reach', () => {
    for (const reach of [0.5, 14, 40]) expectNoHalo(withHalo({ strength: 0, reach, offset: 20 }), `reach ${reach}`);
  });

  it('draws nothing of it, and frames only the sheets and tile, when the reach is 0 whatever the strength', () => {
    for (const strength of [0.01, 0.5, 1]) {
      expectNoHalo(withHalo({ strength, reach: 0, offset: 20 }), `strength ${strength}`);
    }
  });
});

describe('configurations saved before the sheet variation and the halo', () => {
  const stored = JSON.stringify(Object.entries(savedConfigs).map(([id, config]) => ({ id, name: id, config })));
  // The defaults turn both on; other defaults that turn them on differently load the same.
  const otherDefaults: LogoConfig = {
    ...defaultLogoConfig,
    emblem: { ...defaultLogoConfig.emblem, rotationJitter: 6, sizeJitter: 0.1, offsetJitter: 4, seed: 9 },
    tile: { ...defaultLogoConfig.tile, halo: { strength: 0.9, reach: 30, offset: 12 } },
  };

  it('load with both switched off, whatever the defaults', () => {
    for (const defaults of [defaultLogoConfig, otherDefaults]) {
      const presets = parsePresets(stored, defaults, fillMissing);
      expect(presets).toHaveLength(Object.keys(savedConfigs).length);
      for (const { id, config } of presets) {
        expect(variationOf(config), id).toEqual({
          rotationJitter: 0,
          sizeJitter: 0,
          aspectJitter: 0,
          offsetJitter: 0,
          seed: 1,
        });
        expect(config.tile.halo, id).toEqual({ strength: 0, reach: 14, offset: 5 });
      }
    }
  });
});
