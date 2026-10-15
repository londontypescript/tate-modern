import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import { unionBox, type LogoFonts } from '../../../shared';
import {
  buildLogo,
  defaultLogoConfig,
  emblemRanges,
  type EmblemConfig,
  type LogoConfig,
  type SheetLayer,
} from '../engine';
import { LondonTypeScriptLogo } from './LondonTypeScriptLogo';
import { renderLogoSvg } from './renderSvg';
import { elements, parseTransform, viewBox, writtenRectBox } from './svgParse';
import { TypeScriptMark } from './TypeScriptMark';

let fonts: LogoFonts;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
});

const withEmblem = (emblem: Partial<EmblemConfig>): LogoConfig => ({
  ...defaultLogoConfig,
  emblem: { ...defaultLogoConfig.emblem, ...emblem },
});

const strong = { rotationJitter: 20, sizeJitter: 0.3, aspectJitter: 0.3, offsetJitter: 20 };

/** The sheets' `<rect>`s as written, each with the box its attributes give. */
const writtenSheets = (svg: string) =>
  elements(svg, 'rect')
    .filter((r) => r.id?.includes('layer-'))
    .map((r) => ({ attrs: r, box: writtenRectBox(r) }));

const TOLERANCE = 0.01;

function expectContained(svg: string, label: string) {
  const frame = viewBox(svg);
  for (const { attrs, box } of writtenSheets(svg)) {
    const where = `${label} ${attrs.id}`;
    expect(box.minX, where).toBeGreaterThanOrEqual(frame.minX - TOLERANCE);
    expect(box.minY, where).toBeGreaterThanOrEqual(frame.minY - TOLERANCE);
    expect(box.maxX, where).toBeLessThanOrEqual(frame.maxX + TOLERANCE);
    expect(box.maxY, where).toBeLessThanOrEqual(frame.maxY + TOLERANCE);
  }
}

describe('sheets as written to the SVG', () => {
  it('stay inside the viewBox of every export, for many seeds and strong variation', () => {
    let nearBoundary = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const config = withEmblem({ ...strong, seed, layerCount: 6 + (seed % 11), cornerRadius: (seed % 5) * 3 });
      const logo = buildLogo(config, fonts);
      const { minX, minY, maxX, maxY } = logo.emblem.bounds;
      for (const edge of [minX, minY, maxX, maxY]) {
        const hundredths = Math.abs(edge) * 100;
        if (Math.abs(hundredths - Math.round(hundredths)) < 0.05) nearBoundary++;
      }
      expectContained(renderLogoSvg('mark', logo), `seed ${seed} mark`);
      expectContained(renderLogoSvg('logo', logo), `seed ${seed} logo`);
    }
    // The sweep includes bounds that sit right by a rounding step of the viewBox.
    expect(nearBoundary).toBeGreaterThan(5);
  });

  it('stay inside the viewBox at the largest accepted sizes, where rounding the angle moves corners most', () => {
    const { squareSize, sizeTaper } = emblemRanges;
    for (let seed = 1; seed <= 60; seed++) {
      const config = withEmblem({
        ...strong,
        seed,
        layerCount: 16,
        squareSize: squareSize.max,
        sizeTaper: sizeTaper.min,
        cornerRadius: 0,
        initialRotation: 0.0005 + seed * 0.0137,
        rotationIncrement: 0.0049,
      });
      const logo = buildLogo(config, fonts);
      expectContained(renderLogoSvg('mark', logo), `seed ${seed} largest mark`);
      expectContained(renderLogoSvg('logo', logo), `seed ${seed} largest logo`);
    }
  });

  it('are framed tightly: the static viewBox is no bigger than what is drawn', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const logo = buildLogo(withEmblem({ ...strong, seed }), fonts);
      const svg = renderLogoSvg('mark', logo);
      const half = defaultLogoConfig.tile.size / 2;
      const drawn = writtenSheets(svg).reduce((box, s) => unionBox(box, s.box), {
        minX: -half,
        minY: -half,
        maxX: half,
        maxY: half,
      });
      const frame = viewBox(svg);
      for (const key of ['minX', 'minY', 'maxX', 'maxY'] as const) {
        expect(Math.abs(frame[key] - drawn[key]), `seed ${seed} ${key}`).toBeLessThan(0.02);
      }
    }
  });

  it('stay inside the rotation-safe viewBox at any angle while animating', () => {
    for (const seed of [1, 17, 404, 999]) {
      const logo = buildLogo(withEmblem({ ...strong, seed }), fonts);
      for (let step = 0; step < 72; step++) {
        const rotations = logo.emblem.layers.map((l, i) => l.rotation + step * 5 * (i % 2 ? -1 : 1) + i * 7);
        const svg = renderToStaticMarkup(
          <TypeScriptMark emblem={logo.emblem} rotations={rotations} framing="rotation-safe" idPrefix="t" />,
        );
        const sheets = writtenSheets(svg);
        expect(sheets).toHaveLength(logo.emblem.layers.length);
        logo.emblem.layers.forEach((layer, i) => {
          // Each sheet is drawn at the angle asked for, still at its own centre.
          const t = parseTransform(sheets[i]?.attrs.transform ?? '');
          const written = (v: number) => Number(v.toFixed(3));
          expect([t.x, t.y, t.rotation]).toEqual([written(layer.x), written(layer.y), written(rotations[i] ?? NaN)]);
        });
        expectContained(svg, `seed ${seed} step ${step}`);
      }
    }
  });

  it('turn about their own centre: the offset is a translate before the rotate, written only when non-zero', () => {
    const neutral = renderLogoSvg('mark', buildLogo(defaultLogoConfig, fonts));
    for (const { attrs } of writtenSheets(neutral)) expect(attrs.transform).toMatch(/^rotate\(/);

    const logo = buildLogo(withEmblem({ offsetJitter: 10, aspectJitter: 0.2, seed: 5 }), fonts);
    const sheets = writtenSheets(renderLogoSvg('mark', logo));
    logo.emblem.layers.forEach((layer, i) => {
      const attrs = sheets[i]?.attrs ?? {};
      const t = parseTransform(attrs.transform ?? '');
      expect(t.x).toBeCloseTo(layer.x, 3);
      expect(t.y).toBeCloseTo(layer.y, 3);
      // Centred on its pivot (to within the rounding of the written numbers),
      // so the rotation never swings it round the origin.
      expect(Math.abs(Number(attrs.x) + Number(attrs.width) / 2)).toBeLessThanOrEqual(0.001);
      expect(Math.abs(Number(attrs.y) + Number(attrs.height) / 2)).toBeLessThanOrEqual(0.001);
    });
  });
});

describe('the fade on a non-square, offset sheet', () => {
  it('lives in the sheet’s own frame, across its smaller side, at its true angle', () => {
    const config = withEmblem({ ...strong, seed: 3, fade: 0.6, fadeAngle: 37, fadeTurn: 0 });
    const logo = buildLogo(config, fonts);
    const svg = renderLogoSvg('mark', logo, { idPrefix: 'lts' });
    const gradients = elements(svg, 'linearGradient');
    const sheets = writtenSheets(svg);
    const layer = logo.emblem.layers.find(
      (l) => Math.abs(l.width - l.height) > 5 && Math.abs(l.x) > 1 && Math.abs(l.y) > 1 && l.rotation % 90 > 10,
    ) as SheetLayer;
    expect(layer).toBeDefined();

    const gradient = gradients.find((g) => g.id === `lts-fade-${layer.index}`) ?? {};
    expect(gradient.gradientUnits).toBe('userSpaceOnUse');
    const half = Math.min(layer.width, layer.height) / 2;
    const [cos, sin] = [Math.cos((37 * Math.PI) / 180), Math.sin((37 * Math.PI) / 180)];
    expect(Number(gradient.x1)).toBeCloseTo(-half * cos, 3);
    expect(Number(gradient.y1)).toBeCloseTo(-half * sin, 3);
    expect(Number(gradient.x2)).toBeCloseTo(half * cos, 3);
    expect(Number(gradient.y2)).toBeCloseTo(half * sin, 3);

    const rect = sheets[layer.index]?.attrs ?? {};
    expect(rect.fill).toBe(`url(#lts-fade-${layer.index})`);
    const t = parseTransform(rect.transform ?? '');
    expect([t.x, t.y, t.rotation]).toEqual([layer.x, layer.y, layer.rotation].map((v) => Number(v.toFixed(3))));
  });

  it('runs edge to edge across a square, as the bounding-box gradient did', () => {
    const logo = buildLogo(withEmblem({ fade: 0.8, fadeAngle: 20, fadeTurn: 137.5 }), fonts);
    const svg = renderLogoSvg('mark', logo, { idPrefix: 'lts' });
    const gradients = elements(svg, 'linearGradient');
    logo.emblem.layers.forEach((layer) => {
      const g = gradients.find((x) => x.id === `lts-fade-${layer.index}`) ?? {};
      const angle = ((layer.fade?.angle ?? NaN) * Math.PI) / 180;
      // The old gradient's endpoints, in the rect's bounding box (0..1), mapped to its user space.
      const fromBox = (fraction: number) => -layer.width / 2 + layer.width * fraction;
      expect(Number(g.x1)).toBeCloseTo(fromBox(0.5 - Math.cos(angle) / 2), 3);
      expect(Number(g.y1)).toBeCloseTo(fromBox(0.5 - Math.sin(angle) / 2), 3);
      expect(Number(g.x2)).toBeCloseTo(fromBox(0.5 + Math.cos(angle) / 2), 3);
      expect(Number(g.y2)).toBeCloseTo(fromBox(0.5 + Math.sin(angle) / 2), 3);
    });
  });
});

describe('gradient ids', () => {
  /** Each `<svg>` of a page, with its own ids and the ids its fills point at. */
  const perSvg = (html: string) =>
    html
      .split('<svg')
      .slice(1)
      .map((svg) => ({
        ids: new Set([...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])),
        refs: [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]),
      }));

  it('resolve inside their own SVG when two live logos of the same configuration share a page', () => {
    const logo = buildLogo(withEmblem({ ...strong, fade: 0.7 }), fonts);
    const html = renderToStaticMarkup(
      <>
        <TypeScriptMark emblem={logo.emblem} />
        <TypeScriptMark emblem={logo.emblem} />
        <LondonTypeScriptLogo logo={logo} />
      </>,
    );
    const svgs = perSvg(html);
    expect(svgs).toHaveLength(3);
    svgs.forEach((svg, i) => {
      expect(svg.refs).toHaveLength(logo.emblem.layers.length);
      for (const ref of svg.refs) {
        expect(svg.ids.has(ref), `svg ${i} -> #${ref}`).toBe(true);
        svgs.forEach((other, j) => j !== i && expect(other.ids.has(ref), `#${ref} also in svg ${j}`).toBe(false));
      }
    });
  });

  it('take the export’s own prefix, one per sheet', () => {
    const svg = renderLogoSvg('mark', buildLogo(withEmblem({ fade: 0.5 }), fonts));
    const prefix = / id="(lts-[0-9a-f]{32})-emblem"/.exec(svg)?.[1];
    expect(prefix).toBeDefined();
    expect(elements(svg, 'linearGradient').map((g) => g.id)).toEqual(
      Array.from({ length: defaultLogoConfig.emblem.layerCount }, (_, i) => `${prefix}-fade-${i}`),
    );
  });
});
