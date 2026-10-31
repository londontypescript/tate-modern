import { createHash } from 'node:crypto';
import { Resvg } from '@resvg/resvg-js';
import { PNG } from 'pngjs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { palette } from '../../shared/palette';
import { assetManifest } from '../assets/manifest';
import { renderAssetSvg } from '../assets/renderAsset';
import {
  bandRect,
  edgeChoices,
  plainEdges,
  slotRecipes,
  tileLettering,
  type BandSide,
  type SlotEdges,
} from '../engine';
import type { KernedFont } from '../wordmark/fonts';
import { slotFileName } from '../studio/slotDownload';
import { renderSlotSvg } from './renderSlot';

let lettering: string;
let font: KernedFont;
beforeAll(async () => {
  lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
  font = (await loadBubbleFontsFromDisk()).wordmark;
});

const recipe = slotRecipes.find((r) => r.id === 'meetupPhoto');
if (!recipe?.canvas || !recipe.edges || recipe.detail === 'bySize') throw new Error('The Meetup photo has edges');
const meetup = { ...recipe, detail: recipe.detail };
const canvas = recipe.canvas;
const { bandWidth, cornerRadius } = recipe.edges;

const svgOf = (edges: SlotEdges) => renderSlotSvg(meetup, 'dark', { lettering, font }, edges);
const rasterOf = (edges: SlotEdges) => new Resvg(svgOf(edges)).render();
const label = (e: SlotEdges) => `band ${e.band}, corners ${e.corners}`;
const ids = (svg: string) => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1] ?? '');

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const fan = [palette.sunsetPlum, palette.sunsetMagenta, palette.sunsetPink, palette.sunsetOrange, palette.sunsetGold];
const distance = (a: number[], b: number[]) => Math.max(...[0, 1, 2].map((c) => Math.abs((a[c] ?? 0) - (b[c] ?? 0))));

describe('the Meetup photo, plain', () => {
  // Drawn on main before the band existed: the plain drawing must not move by a byte.
  it('is byte for byte the drawing it was before the band and corners', () => {
    const svg = svgOf(plainEdges);
    expect(createHash('sha256').update(svg).digest('hex')).toBe(
      '1849595edbcc2fbe84831be26f591b8b5e0f8a0689d5c89df004420cb98353ab',
    );
  });

  it('is the committed asset’s own source, under the committed file’s name', () => {
    const entry = assetManifest.find((e) => e.source.kind === 'slot' && e.source.recipe.id === 'meetupPhoto');
    if (!entry) throw new Error('The Meetup photo is in the manifest');
    expect(svgOf(plainEdges)).toBe(renderAssetSvg(entry, { lettering, font }));
    expect(slotFileName(meetup, plainEdges, 'png')).toBe(entry.file);
  });
});

describe('the Meetup photo’s band', () => {
  let plain: Uint8Array;
  beforeAll(() => {
    plain = rasterOf(plainEdges).pixels;
  });

  it.each(['left', 'right', 'top', 'bottom'] as const)(
    '%s: paints only its own strip, so the logo, the safe rectangle and the glow are untouched',
    (side: BandSide) => {
      const { pixels } = rasterOf({ band: side, corners: 'off' });
      const strip = bandRect(canvas, side, bandWidth);
      let inside = 0;
      let outside = 0;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const changed = [0, 1, 2, 3].some((c) => pixels[i + c] !== plain[i + c]);
          const within = x >= strip.x && x < strip.x + strip.width && y >= strip.y && y < strip.y + strip.height;
          if (within && changed) inside++;
          if (!within && changed) outside++;
        }
      }
      expect(outside, 'pixels changed outside the strip').toBe(0);
      expect(inside, 'pixels of the strip painted').toBe(strip.width * strip.height);
    },
  );

  it.each(['left', 'right', 'top', 'bottom'] as const)(
    '%s: runs the fan plum to gold, in order, along its edge',
    (side: BandSide) => {
      const { pixels } = rasterOf({ band: side, corners: 'off' });
      const strip = bandRect(canvas, side, bandWidth);
      const length = strip.runs === 'down' ? strip.height : strip.width;
      const at = (t: number) => {
        const along = Math.min(length - 1, Math.round(t * (length - 1)));
        const x = strip.runs === 'down' ? strip.x + strip.width / 2 : strip.x + along;
        const y = strip.runs === 'down' ? strip.y + along : strip.y + strip.height / 2;
        const i = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
        return [pixels[i] ?? 0, pixels[i + 1] ?? 0, pixels[i + 2] ?? 0];
      };
      fan.forEach((colour, n) =>
        expect(distance(at(n / 4), hex(colour)), `${colour} at ${n}/4`).toBeLessThanOrEqual(3),
      );
    },
  );
});

describe('the Meetup photo’s rounded corners', () => {
  const alpha = (pixels: Uint8Array, x: number, y: number) => pixels[(y * canvas.width + x) * 4 + 3];

  it('cut every corner to transparent, and leave the edges between them whole', () => {
    const { pixels } = rasterOf({ band: 'off', corners: 'on' });
    const r = cornerRadius;
    // Just outside each corner's arc, then just inside it.
    const inset = Math.round(r * 0.1);
    for (const [x, y] of [
      [inset, inset],
      [canvas.width - 1 - inset, inset],
      [inset, canvas.height - 1 - inset],
      [canvas.width - 1 - inset, canvas.height - 1 - inset],
    ] as const) {
      expect(alpha(pixels, x, y), `${x},${y}`).toBe(0);
    }
    for (const [x, y] of [
      [r, r],
      [canvas.width - 1 - r, canvas.height - 1 - r],
      [canvas.width / 2, 0],
      [0, Math.round(canvas.height / 2)],
    ] as const) {
      expect(alpha(pixels, x, y), `${x},${y}`).toBe(255);
    }
  });

  it('are square when off', () => {
    const { pixels } = rasterOf(plainEdges);
    expect(alpha(pixels, 0, 0)).toBe(255);
    expect(alpha(pixels, canvas.width - 1, canvas.height - 1)).toBe(255);
  });

  it('cut the band too', () => {
    const { pixels } = rasterOf({ band: 'left', corners: 'on' });
    expect(alpha(pixels, 1, 1)).toBe(0);
    expect(alpha(pixels, 1, Math.round(canvas.height / 2))).toBe(255);
  });
});

describe('every band and corner combination', () => {
  it.each(edgeChoices.map((e) => [label(e), e] as const))(
    '%s: a self-contained SVG, and a 1200 × 675 PNG',
    (_, edges) => {
      const svg = svgOf(edges);
      for (const banned of ['var(', 'style=', 'class=', '<use', 'href', '<text', '<image', '@import']) {
        expect(svg, banned).not.toContain(banned);
      }
      expect(svg).toContain(`width="${canvas.width}" height="${canvas.height}" viewBox="0 0 1200 675"`);
      const all = ids(svg);
      const prefix = /^(lts-[0-9a-f]{32})-/.exec(all[0] ?? '')?.[1];
      expect(prefix).toBeDefined();
      for (const id of all) expect(id.startsWith(`${prefix}-`), id).toBe(true);
      expect(new Set(all).size).toBe(all.length);
      for (const [, ref = ''] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(all, ref).toContain(ref);

      const png = PNG.sync.read(Buffer.from(new Resvg(svg).render().asPng()));
      expect([png.width, png.height]).toEqual([canvas.width, canvas.height]);
    },
  );

  it('share no id between any two of them, so they can sit on one page', () => {
    const seen = new Map<string, string>();
    for (const edges of edgeChoices) {
      for (const id of ids(svgOf(edges))) {
        expect(seen.get(id), id).toBeUndefined();
        seen.set(id, label(edges));
      }
    }
  });
});
