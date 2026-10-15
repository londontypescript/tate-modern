import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import type { Box, LogoFonts } from '../../../shared';
import { studioSvg, studioView } from '../FlatStudio';
import { buildLogo, defaultLogoConfig, type LogoConfig } from '../engine';
import { malformedContainers, numericLeaves, pathName, untrusted, withLeaf } from '../testing/numericLeaves';
import { colourLeaves, notColours } from '../testing/stringLeaves';
import { renderLogoSvg, svgVariants } from './renderSvg';
import { viewBox } from './svgParse';

let fonts: LogoFonts;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
});

const finiteBox = (box: Box) => [box.minX, box.minY, box.maxX, box.maxY].every(Number.isFinite);

describe('the logo from a saved configuration with untrusted numbers', () => {
  // One test per field: all of them in one test took close to the default
  // timeout on a slow runner, and a failure now names the field.
  for (const [path] of numericLeaves) {
    it(`builds finite bounds and writes well-formed SVG when ${pathName(path)} is bad`, () => {
      for (const [name, value] of untrusted) {
        expectWellFormed(`${pathName(path)} = ${name}`, withLeaf(path, value));
      }
    });
  }

  it('builds and writes well-formed SVG when a part of the configuration is malformed', () => {
    for (const [name, config] of malformedContainers) expectWellFormed(name, config);
  });
});

function expectWellFormed(label: string, config: LogoConfig) {
  const logo = buildLogo(config, fonts);
  expect(finiteBox(logo.bounds) && finiteBox(logo.rotationSafeBounds), label).toBe(true);
  for (const variant of svgVariants) {
    const svg = renderLogoSvg(variant, logo);
    expect(svg, `${label}, ${variant}`).not.toMatch(/NaN|Infinity|undefined/);
    const box = viewBox(svg);
    expect(finiteBox(box) && box.maxX > box.minX && box.maxY > box.minY, `${label}, ${variant}`).toBe(true);
  }
}

/**
 * Every colour field reaches the output: sheets present (the defaults have
 * six), the wordmark's runs populated (as in the defaults), the halo on, and
 * the fade off and on, so the fade colour is written too.
 */
const halo = withLeaf(['tile', 'halo'], { strength: 0.5, reach: 12, offset: 4 });
const bases: [string, LogoConfig][] = [
  ['fade off', halo],
  ['fade on', withLeaf(['emblem', 'fade'], 0.6, halo)],
];

/** The background `<rect>` the frame writes straight after the title, if any. */
const backgroundFill = (svg: string) => /<\/title><rect [^>]*fill="([^"]*)"/.exec(svg)?.[1];

/**
 * What a downloaded file may hold, whatever was saved: every fill, stop
 * colour and background is `#` and six hex digits or points at an id in the
 * same file, every style is the sheets' one blend declaration (or their
 * group's fixed isolation), and every id is well-formed and unique.
 */
function expectSafe(label: string, svg: string) {
  const ids = [...svg.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1] ?? '');
  for (const id of ids) expect(id, `${label}: id`).toMatch(/^[A-Za-z][A-Za-z0-9_-]*$/);
  expect(new Set(ids).size, `${label}: unique ids`).toBe(ids.length);
  for (const [, name, value = ''] of svg.matchAll(/\s(fill|stop-color)="([^"]*)"/g)) {
    const target = /^url\(#([^)]*)\)$/.exec(value)?.[1];
    if (target === undefined) expect(value, `${label}: ${name}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    else expect(ids, `${label}: ${name} = ${value}`).toContain(target);
  }
  for (const [, ref = ''] of svg.matchAll(/url\(#([^)]*)\)/g)) expect(ids, `${label}: url(#${ref})`).toContain(ref);
  for (const [, style] of svg.matchAll(/\sstyle="([^"]*)"/g)) {
    expect(style, `${label}: style`).toMatch(/^(mix-blend-mode:(normal|multiply)|isolation:isolate)$/);
  }
  expect(svg, label).not.toMatch(/onload|<script/i);
}

describe('the studio’s download from a saved configuration with untrusted strings', () => {
  /** Through the function the Download buttons call, with and without the background. */
  const expectSafeDownloads = (label: string, config: LogoConfig) => {
    const view = studioView(config, fonts);
    for (const variant of svgVariants) {
      for (const background of [false, true]) {
        const svg = studioSvg(view, variant, background);
        expectSafe(`${label}, ${variant}${background ? ', background' : ''}`, svg);
        expect(backgroundFill(svg), label).toBe(background ? view.used.layout.background : undefined);
      }
    }
  };

  // One test per colour and base, as for the numbers: together they ran close to the default timeout.
  for (const [base, config] of bases) {
    for (const path of colourLeaves) {
      it(`writes only real colours when ${pathName(path)} is bad, with the ${base}`, () => {
        for (const [name, value] of notColours) {
          expectSafeDownloads(`${base}, ${pathName(path)} = ${name}`, withLeaf(path, value, config));
        }
      });
    }
  }

  it('writes one blend declaration and well-formed ids, whatever blend mode or text is saved', () => {
    const hostile = '"/><script>x</script><g onload="y" é';
    const cases: [string, LogoConfig][] = [
      ...['screen', 'multiply; fill: url(#x)', '"/><script>', 5, null].map((v): [string, LogoConfig] => [
        `blendMode = ${JSON.stringify(v)}`,
        withLeaf(['emblem', 'blendMode'], v, halo),
      ]),
      ['tile.text', withLeaf(['tile', 'text'], hostile, halo)],
      ['run text', withLeaf(['wordmark', 'lines', 1, 'runs', 1, 'text'], hostile, halo)],
    ];
    for (const [label, config] of cases) expectSafeDownloads(label, config);
  });

  it('previews and downloads the default background in place of a bad one', () => {
    for (const [name, value] of notColours) {
      const view = studioView(withLeaf(['layout', 'background'], value), fonts);
      expect(view.used.layout.background, name).toBe(defaultLogoConfig.layout.background);
      for (const variant of svgVariants) {
        expect(backgroundFill(studioSvg(view, variant, true)), `${name}, ${variant}`).toBe(
          defaultLogoConfig.layout.background,
        );
      }
    }
  });
});
