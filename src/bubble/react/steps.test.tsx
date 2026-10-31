import { Resvg } from '@resvg/resvg-js';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { standaloneSvg } from '../../shared/react/standaloneSvg';
import { sha256Hex } from '../../shared/sha256';
import { BubbleLockupSvg } from '../wordmark/BubbleWordmark';
import { themeBackgrounds } from '../wordmark/colours';
import { contrastTarget } from '../wordmark/contrast';
import type { KernedFont } from '../wordmark/fonts';
import { layoutBubbleLockup } from '../wordmark/lockup';
import {
  boxSize,
  buildBubble,
  details,
  stepBounds,
  themes,
  tileLettering,
  type Detail,
  type Node,
  type Theme,
} from '../engine';
import { BubbleSvg } from './BubbleSvg';
import { contrastAgainstGround, contrastOver } from './measureContrast';
import { renderBubbleSvg } from './renderSvg';

let lettering: string;
let wordmark: KernedFont;
beforeAll(async () => {
  lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
  wordmark = (await loadBubbleFontsFromDisk()).wordmark;
});

const ids = (svg: string) => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1] ?? '');
const refs = (svg: string) => [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1] ?? '');
const each = themes.flatMap((theme) => details.map((detail) => [theme, detail] as [Theme, Detail]));

/** A file with its frame opened out 20 units on every side, so nothing past the frame is clipped. */
const openedOut = (svg: string) => {
  const framed = svg.replace(/width="240" height="[\d.]+" viewBox="0 0 240 [\d.]+"/, 'viewBox="-20 -20 280 300"');
  if (framed === svg) throw new Error('The file’s frame was not found');
  return framed;
};

/** The y of the bottom of the last row with any paint, in the drawing's units. */
function lastPaintedRow(svg: string, scale: number) {
  const { pixels, width } = new Resvg(openedOut(svg), { fitTo: { mode: 'width', value: 280 * scale } }).render();
  for (let i = pixels.length - 1; i >= 3; i -= 4) {
    if (pixels[i] !== 0) return (Math.floor((i - 3) / 4 / width) + 1) / scale - 20;
  }
  return -Infinity;
}

describe('every step as an exported file', () => {
  it.each(each)('%s %s: is self-contained, its ids prefixed and its references found', (theme, detail) => {
    const svg = renderBubbleSvg(theme, lettering, { detail });
    for (const banned of ['var(', 'style', 'class=', '<use', 'href', '<text', '<image', '@import']) {
      expect(svg, banned).not.toContain(banned);
    }
    // The full step's frame is taller, to hold its ground; the smaller ones keep the square.
    const height = detail === 'full' ? 253 : 240;
    expect(svg).toContain(`width="240" height="${height}" viewBox="0 0 240 ${height}"`);
    const prefix = /^(lts-[0-9a-f]{32})-/.exec(ids(svg)[0] ?? '')?.[1];
    expect(prefix).toBeDefined();
    for (const id of ids(svg)) expect(id.startsWith(`${prefix}-`), id).toBe(true);
    for (const ref of refs(svg)) expect(ids(svg), ref).toContain(ref);
  });

  it('gives each theme and step its own prefix, and the same file every time', () => {
    const prefixes = each.map(
      ([theme, detail]) => / id="(lts-[0-9a-f]{32})-/.exec(renderBubbleSvg(theme, lettering, { detail }))?.[1],
    );
    expect(new Set(prefixes).size).toBe(each.length);
    expect(renderBubbleSvg('dark', lettering, { detail: 'tiny' })).toBe(
      renderBubbleSvg('dark', lettering, { detail: 'tiny' }),
    );
  });

  it.each(each)('%s %s: renders through resvg, painting only inside the step’s painted bounds', (theme, detail) => {
    // 4 px per unit, with the box opened out so nothing past the frame is clipped.
    const scale = 4;
    const svg = openedOut(renderBubbleSvg(theme, lettering, { detail }));
    const image = new Resvg(svg, { fitTo: { mode: 'width', value: 280 * scale } }).render();
    const painted = stepBounds(detail, theme).painted;
    // `pixels` copies the image on every read, so read it once.
    const { pixels, width } = image;
    let seen = 0;
    let outside = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) continue;
      seen++;
      const p = (i - 3) / 4;
      const x = (p % width) / scale - 20;
      const y = Math.floor(p / width) / scale - 20;
      // A quarter-unit allowance for the edge pixels' anti-aliasing.
      const slack = 1 / scale;
      if (
        x < painted.minX - slack ||
        x > painted.maxX + slack ||
        y < painted.minY - slack ||
        y > painted.maxY + slack
      ) {
        outside++;
      }
    }
    expect(seen).toBeGreaterThan(1000);
    expect(outside, 'painted pixels outside the stated bounds').toBe(0);
  });
});

describe('the full step’s frame', () => {
  // Taken from the rendered ground, not padded: the frame ends where the dark caustic's last visible row does.
  it('holds the dark caustic to its last visible row, with less than a unit to spare', () => {
    const bottom = lastPaintedRow(renderBubbleSvg('dark', lettering), 8);
    const { frame } = stepBounds('full', 'dark');
    expect(bottom).toBeLessThanOrEqual(frame.maxY);
    expect(bottom).toBeGreaterThan(frame.maxY - 1);
  });

  it('holds the light shadow’s tail, which the square used to cut at y 240', () => {
    const bottom = lastPaintedRow(renderBubbleSvg('light', lettering), 8);
    expect(bottom).toBeGreaterThan(240);
    expect(bottom).toBeLessThanOrEqual(stepBounds('full', 'light').frame.maxY);
  });
});

describe('the smaller steps’ files', () => {
  // Only the full step's ground and frame changed with the caustic: these hashes are each file as it was
  // before, so any change to a smaller step's bytes is seen here, not discovered in a favicon later.
  const before: Record<string, string> = {
    'light small': 'fddd9e731e771e8b382484e5245d4bd24af56450a0cb7e8a61004ac978bbc2eb',
    'light tiny': 'e9c75aee5c0104bc141d3d521d6ae0567b8afa433f51489c18fe9295e610262d',
    'light none': 'dd38684a10d4ea8d768746abe4c49220aec773ad513b3d853e4f127a534ce372',
    'dark small': 'c0293f4e0154dce6f94c3975bfcbf3e4ea5f803054b5b18ad6e5b486fd22d2c5',
    'dark tiny': 'c028051c3be4c07a4c5c01fcc1bb9ebda5192948ccdf2546f6f34885b4dbeef2',
    'dark none': '4dbb47072a3e898fc5e8704276c33e7df0074afa1ccb4ba606e03bb611daca91',
  };
  it.each(each.filter(([, detail]) => detail !== 'full'))('%s %s: is byte for byte as before', (theme, detail) => {
    expect(sha256Hex(renderBubbleSvg(theme, lettering, { detail }))).toBe(before[`${theme} ${detail}`]);
  });
});

describe('every step drawn live', () => {
  it('gives every drawing on a page its own ids, mixing themes and steps and repeating them', () => {
    const html = renderToStaticMarkup(
      <>
        {each.map(([theme, detail]) => (
          <BubbleSvg key={`${theme}-${detail}`} drawing={buildBubble({ theme, detail, lettering })} size={32} />
        ))}
        <BubbleSvg drawing={buildBubble({ theme: 'light', detail: 'small', lettering })} size={40} />
      </>,
    );
    const all = ids(html);
    expect(all.filter((id, i) => all.indexOf(id) !== i)).toEqual([]);
    for (const svg of html.split('<svg').slice(1)) for (const ref of refs(svg)) expect(ids(svg), ref).toContain(ref);
  });
});

describe('a smaller step inside a lockup file', () => {
  it.each(['small', 'tiny', 'none'] as const)('%s: takes its ids from the export’s prefix', (detail) => {
    const svg = standaloneSvg(`bubble/lockup-test-${detail}`, (idPrefix) => (
      <BubbleLockupSvg
        lockup={layoutBubbleLockup(wordmark, { emblemSize: 32, theme: 'light' })}
        emblem={{
          side: boxSize,
          content: (
            <BubbleSvg
              drawing={buildBubble({ theme: 'light', detail, lettering })}
              size={boxSize}
              idPrefix={`${idPrefix}-emblem`}
            />
          ),
        }}
        idPrefix={idPrefix}
      />
    ));
    const prefix = /<g id="(lts-[0-9a-f]{32})-emblem"/.exec(svg)?.[1];
    expect(prefix).toBeDefined();
    for (const id of ids(svg)) expect(id.startsWith(`${prefix}-`), id).toBe(true);
    expect(refs(svg).length).toBeGreaterThan(0);
    for (const ref of refs(svg)) expect(ids(svg), ref).toContain(ref);
  });
});

describe('contrast, from each step’s actual paints (3:1)', () => {
  const isLettering = (n: Node) => n.kind === 'path' && n.d === lettering;
  const isTile = (n: Node) => n.kind === 'rect' && n.width === 116;

  it.each(each)('%s %s: the white TS against the tile under it', (theme, detail) => {
    const drawing = buildBubble({ theme, detail, lettering });
    if (detail === 'none') return expect(drawing.layers.flatMap((l) => l.children).some(isLettering)).toBe(false);
    const ts = contrastOver(drawing, themeBackgrounds[theme], isLettering);
    expect(ts.count).toBeGreaterThan(1000);
    expect(ts.min).toBeGreaterThanOrEqual(contrastTarget);
  });

  // The emblem as a whole, as the maintainer approved: the tile, which every
  // step draws, with at least 90% of its visible pixels at 3:1 against the
  // page. The rest are the gloss and highlight, as the reference draws them.
  it.each(each)('%s %s: the emblem as a whole, by its tile, against the page', (theme, detail) => {
    const tile = contrastAgainstGround(
      buildBubble({ theme, detail, lettering }),
      themeBackgrounds[theme],
      isTile,
      isLettering,
    );
    expect(tile.count).toBeGreaterThan(1000);
    expect(tile.share(contrastTarget)).toBeGreaterThanOrEqual(0.9);
  });
});
