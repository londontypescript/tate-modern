import { Resvg } from '@resvg/resvg-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { palette } from '../../shared/palette';
import type { Box } from '../../shared/types';
import { standaloneSvg } from '../../shared/react/standaloneSvg';
import { unionBox } from '../../shared/typography';
import { wordmarkColours } from '../wordmark/colours';
import { contrastRatio, contrastTarget } from '../wordmark/contrast';
import type { KernedFont } from '../wordmark/fonts';
import { layoutBubbleLockup } from '../wordmark/lockup';
import {
  boxSize,
  buildBubble,
  detailForDiameter,
  stepBounds,
  slotRecipes,
  sphereDiameterInFrame,
  tileLettering,
  type Detail,
  type Node,
  type SlotRecipe,
} from '../engine';
import { contrastAgainstGround, contrastOver } from './measureContrast';
import { SlotSvg, slotCanvas } from './SlotSvg';

let lettering: string;
let font: KernedFont;
beforeAll(async () => {
  lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
  font = (await loadBubbleFontsFromDisk()).wordmark;
});

const images = slotRecipes.filter((r): r is SlotRecipe & { detail: Detail } => r.detail !== 'bySize');

/** The content's layout box (the emblem's square, or the lockup's), which places it, in canvas units. */
function contentSize(recipe: SlotRecipe) {
  if (recipe.composition === 'emblem') return { width: recipe.emblemSide, height: recipe.emblemSide };
  const lockup = layoutBubbleLockup(font, { emblemSize: recipe.emblemSide, theme: 'light' });
  const box = unionBox(lockup.box, lockup.wordmarkInk);
  return { width: box.maxX - box.minX, height: box.maxY - box.minY };
}

describe('the slot recipes', () => {
  it('give every slot once, the studio choosing its step by size', () => {
    expect(slotRecipes.map((r) => r.id)).toEqual([
      'favicon',
      'appleTouchIcon',
      'githubAvatar',
      'readmeHeader',
      'meetupPhoto',
      'studio',
    ]);
    expect(slotRecipes.find((r) => r.id === 'studio')?.detail).toBe('bySize');
  });

  it.each(images.map((r) => [r.id, r] as const))(
    '%s: draws the step its smallest display chooses, or says why not',
    (_, recipe) => {
      const canvasWidth = recipe.canvas?.width ?? contentSize(recipe).width;
      const emblemFrame = (recipe.smallestDisplay.width * recipe.emblemSide) / canvasWidth;
      const chosen = detailForDiameter(sphereDiameterInFrame(emblemFrame));
      if (recipe.detail === chosen) expect(recipe.detailReason).toBeUndefined();
      else expect(recipe.detailReason, `${recipe.detail} rather than ${chosen}`).toMatch(/maintainer/);
    },
  );

  it('puts every fixed background on GitHub dark, with the dark drawing', () => {
    for (const recipe of images.filter((r) => r.background.kind === 'fixed')) {
      expect(recipe.background, recipe.id).toEqual({ kind: 'fixed', colour: palette.darkPage });
      expect(recipe.themes, recipe.id).toEqual(['dark']);
    }
  });

  it.each(images.filter((r) => r.canvas).map((r) => [r.id, r] as const))(
    '%s: fits its content inside the canvas and its safe rectangle',
    (_, recipe) => {
      const canvas = recipe.canvas ?? { width: 0, height: 0 };
      const size = contentSize(recipe);
      const box = {
        minX: (canvas.width - size.width) / 2,
        minY: (canvas.height - size.height) / 2,
        maxX: (canvas.width + size.width) / 2,
        maxY: (canvas.height + size.height) / 2,
      };
      const safe = recipe.safe ?? { minX: 0, minY: 0, maxX: canvas.width, maxY: canvas.height };
      expect(box.minX).toBeGreaterThanOrEqual(safe.minX);
      expect(box.minY).toBeGreaterThanOrEqual(safe.minY);
      expect(box.maxX).toBeLessThanOrEqual(safe.maxX);
      expect(box.maxY).toBeLessThanOrEqual(safe.maxY);
    },
  );
});

describe('each slot’s image', () => {
  const each = images.flatMap((r) => r.themes.map((theme) => [r.id, theme, r] as const));
  const file = (recipe: SlotRecipe & { detail: Detail }, theme: 'light' | 'dark') =>
    standaloneSvg(`bubble/slot-${recipe.id}-${theme}`, (idPrefix) => (
      <SlotSvg
        recipe={recipe}
        theme={theme}
        detail={recipe.detail}
        lettering={lettering}
        font={font}
        idPrefix={idPrefix}
      />
    ));

  it.each(each)(
    '%s %s: is self-contained, every id under one prefix, and renders through resvg',
    (_, theme, recipe) => {
      const svg = file(recipe, theme);
      for (const banned of ['var(', 'style=', 'class=', '<use', 'href', '<text', '<image', '@import']) {
        expect(svg, banned).not.toContain(banned);
      }
      const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1] ?? '');
      const prefix = /^(lts-[0-9a-f]{32})-/.exec(ids[0] ?? '')?.[1];
      expect(prefix).toBeDefined();
      for (const id of ids) expect(id.startsWith(`${prefix}-`), id).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
      for (const [, ref = ''] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids, ref).toContain(ref);
      if (recipe.canvas) expect(svg).toContain(`viewBox="0 0 ${recipe.canvas.width} ${recipe.canvas.height}"`);

      const image = new Resvg(svg, { fitTo: { mode: 'width', value: 64 } }).render();
      const { pixels } = image;
      const corner = [...pixels.subarray(0, 4)];
      // A fixed background fills the whole canvas, corners included; a transparent one leaves them clear.
      if (recipe.background.kind === 'fixed') expect(corner).toEqual([13, 17, 23, 255]);
      else expect(corner[3]).toBe(0);
    },
  );

  // The recipe's numbers are only half of it: this finds where the image actually paints,
  // so a drawing that lost its scale or its centring fails here, not just in a preview.
  it.each(each)('%s %s: paints its artwork where the recipe puts it', (_, theme, recipe) => {
    const size = contentSize(recipe);
    const canvas = slotCanvas(recipe, theme, recipe.detail, font);
    // Placed by its layout box: centred on a canvas, or at the top left of an image framed by its content.
    const offset = recipe.canvas
      ? { x: (canvas.width - size.width) / 2, y: (canvas.height - size.height) / 2 }
      : { x: 0, y: 0 };
    // At least 400 px across, so a unit is a few pixels even for the 32 px favicon.
    const scale = Math.max(1, 400 / canvas.width);
    const { pixels, width } = new Resvg(file(recipe, theme), {
      fitTo: { mode: 'width', value: canvas.width * scale },
    }).render();
    const ground = recipe.background.kind === 'fixed' ? [13, 17, 23] : undefined;
    const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (let i = 0; i < pixels.length; i += 4) {
      const painted = ground
        ? [0, 1, 2].some((c) => Math.abs((pixels[i + c] ?? 0) - (ground[c] ?? 0)) > 2)
        : (pixels[i + 3] ?? 0) > 2;
      if (!painted) continue;
      const x = ((i / 4) % width) / scale;
      const y = Math.floor(i / 4 / width) / scale;
      box.minX = Math.min(box.minX, x);
      box.minY = Math.min(box.minY, y);
      box.maxX = Math.max(box.maxX, x + 1 / scale);
      box.maxY = Math.max(box.maxY, y + 1 / scale);
    }
    // A pixel's anti-aliasing either side of the edge, in canvas units.
    const slack = 2 / scale + canvas.width * 0.002;
    // The step's own painted box, clipped by its frame, in the emblem's units.
    const { painted: p, frame } = stepBounds(recipe.detail, theme);
    const emblemPainted = (x: number, y: number, side: number) => {
      const k = side / boxSize;
      return {
        minX: x + Math.max(p.minX, frame.minX) * k,
        minY: y + Math.max(p.minY, frame.minY) * k,
        maxX: x + Math.min(p.maxX, frame.maxX) * k,
        maxY: y + Math.min(p.maxY, frame.maxY) * k,
      };
    };
    let expected: Box;
    if (recipe.composition === 'emblem') {
      expected = emblemPainted(offset.x, offset.y, recipe.emblemSide);
    } else {
      // The emblem's painted box and the wordmark's ink, moved as SlotSvg frames the lockup.
      const lockup = layoutBubbleLockup(font, { emblemSize: recipe.emblemSide, theme });
      const frame = unionBox(lockup.box, lockup.wordmarkInk);
      const { emblem } = lockup;
      const ink = unionBox(emblemPainted(emblem.x, emblem.y, emblem.size), lockup.wordmarkInk);
      expected = {
        minX: offset.x + ink.minX - frame.minX,
        minY: offset.y + ink.minY - frame.minY,
        maxX: offset.x + ink.maxX - frame.minX,
        maxY: offset.y + ink.maxY - frame.minY,
      };
    }
    for (const side of ['minX', 'minY', 'maxX', 'maxY'] as const) {
      expect(Math.abs(box[side] - expected[side]), side).toBeLessThanOrEqual(slack);
    }
  });

  // The full bubble's frame is taller than the square, but everything is still placed by the square: a lockup
  // drawn with the small step, whose frame is the square, shows where the logo sat before the frame grew.
  const lockups = each.filter(([, , r]) => r.composition === 'lockup' && r.detail === 'full');
  it.each(lockups)('%s %s: leaves the wordmark where the square put it', (_, theme, recipe) => {
    // resvg rounds an image's height to whole pixels and stretches it to fit, so render at a zoom that makes
    // both heights whole: then the two share one scale on both axes and their pixels can be compared.
    const heights = (['full', 'small'] as const).map((detail) => slotCanvas(recipe, theme, detail, font).height);
    const zoom = [1, 2, 3, 4, 5, 10].find((z) => heights.every((h) => Math.abs(h * z - Math.round(h * z)) < 1e-6));
    if (zoom === undefined) throw new Error(`No zoom makes ${heights.join(' and ')} whole pixels`);
    const render = (detail: Detail) =>
      new Resvg(file({ ...recipe, detail }, theme), { fitTo: { mode: 'zoom', value: zoom } }).render();
    const full = render('full');
    const square = render('small');
    expect(full.width).toBe(square.width);
    // Right of the emblem's square, where only the wordmark paints.
    const canvasWidth = slotCanvas(recipe, theme, 'full', font).width;
    const fromX = Math.ceil(
      (((canvasWidth - contentSize(recipe).width) / 2 + recipe.emblemSide) * full.width) / canvasWidth,
    );
    const ground = recipe.background.kind === 'fixed' ? [13, 17, 23] : undefined;
    // Where the wordmark's ink is, to the pixel. Not every channel: resvg anti-aliases the odd edge pixel a little
    // differently on canvases of different heights, though the wordmark is drawn at the same place.
    const ink = ({ pixels, width, height }: typeof full) => {
      const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, count: 0 };
      for (let y = 0; y < height; y++) {
        for (let x = fromX; x < width; x++) {
          const i = (y * width + x) * 4;
          const inked = ground
            ? [0, 1, 2].some((c) => Math.abs((pixels[i + c] ?? 0) - (ground[c] ?? 0)) > 2)
            : (pixels[i + 3] ?? 0) > 2;
          if (!inked) continue;
          box.count++;
          box.minX = Math.min(box.minX, x);
          box.minY = Math.min(box.minY, y);
          box.maxX = Math.max(box.maxX, x);
          box.maxY = Math.max(box.maxY, y);
        }
      }
      return box;
    };
    const [moved, before] = [ink(full), ink(square)];
    expect(before.count).toBeGreaterThan(1000);
    expect({ ...moved, count: 0 }).toEqual({ ...before, count: 0 });
    expect(Math.abs(moved.count - before.count)).toBeLessThanOrEqual(2);
  });

  // A viewport a hair smaller than the lockup's own viewBox would scale the whole lockup down to fit.
  it.each(lockups)(
    '%s %s: holds the lockup in a viewport exactly its size, so nothing is scaled',
    (_, theme, recipe) => {
      const svg = file(recipe, theme);
      const boxes = [...svg.matchAll(/<svg [^>]*?viewBox="([^"]+)"/g)].map((m) => m[1]);
      // The image, the viewport holding the lockup, the lockup's own frame, then the emblem.
      expect(boxes).toHaveLength(4);
      expect(boxes[1]).toBe(boxes[2]);
      const viewport = /<svg viewBox="[^"]+" width="([\d.]+)" height="([\d.]+)" overflow="hidden"/.exec(svg);
      expect(`0 0 ${viewport?.[1]} ${viewport?.[2]}`).toBe(boxes[2]);
    },
  );

  // The frame holds the ground until it has faded out: the glow reaches as far down as the emblem alone paints
  // it, so nothing cuts it short, and still ends inside the frame, so no straight line shows at its edge.
  it.each(lockups)('%s %s: lets the ground fade out inside the frame', (_, theme, recipe) => {
    const canvas = slotCanvas(recipe, theme, 'full', font);
    // resvg takes only a whole number of pixels, and ignores any other width.
    const { pixels, width, height } = new Resvg(file(recipe, theme), {
      fitTo: { mode: 'width', value: Math.round(canvas.width * 4) },
    }).render();
    const scale = width / canvas.width;
    // The emblem's square in canvas units: placed by the layout box, centred on a canvas or at the image's corner.
    const lockup = layoutBubbleLockup(font, { emblemSize: recipe.emblemSide, theme });
    const layout = unionBox(lockup.box, lockup.wordmarkInk);
    const size = contentSize(recipe);
    const left = (recipe.canvas ? (canvas.width - size.width) / 2 : 0) + lockup.emblem.x - layout.minX;
    const top = (recipe.canvas ? (canvas.height - size.height) / 2 : 0) + lockup.emblem.y - layout.minY;
    const k = recipe.emblemSide / boxSize;
    const ground = recipe.background.kind === 'fixed' ? [13, 17, 23] : undefined;
    let lastRow = -1;
    for (let y = 0; y < height; y++) {
      for (let x = Math.ceil(left * scale); x < Math.floor((left + recipe.emblemSide) * scale); x++) {
        const i = (y * width + x) * 4;
        const painted = ground
          ? [0, 1, 2].some((c) => Math.abs((pixels[i + c] ?? 0) - (ground[c] ?? 0)) > 2)
          : (pixels[i + 3] ?? 0) > 2;
        if (painted) lastRow = y;
      }
    }
    // In the emblem's own units.
    const bottom = ((lastRow + 1) / scale - top) / k;
    const { painted, frame } = stepBounds('full', theme);
    expect(bottom, 'where the glow ends').toBeLessThan(frame.maxY);
    // The faintest rows fall under the 2-of-255 threshold here, so the glow is seen to end a few units short.
    expect(bottom, 'where the glow ends').toBeGreaterThan(painted.maxY - 4);
  });

  // D9's 3:1, in each fixed-background recipe's own theme on its own ground.
  it.each(each.filter(([, , r]) => r.background.kind === 'fixed'))(
    '%s %s: keeps 3:1 on its fixed background',
    (_, theme, recipe) => {
      const ground = recipe.background.kind === 'fixed' ? recipe.background.colour : '';
      const drawing = buildBubble({ theme, detail: recipe.detail, lettering });
      const isLettering = (n: Node) => n.kind === 'path' && n.d === lettering;
      const isTile = (n: Node) => n.kind === 'rect' && n.width === 116;
      expect(contrastOver(drawing, ground, isLettering).min).toBeGreaterThanOrEqual(contrastTarget);
      expect(contrastAgainstGround(drawing, ground, isTile, isLettering).share(contrastTarget)).toBeGreaterThanOrEqual(
        0.9,
      );
      if (recipe.composition === 'lockup') {
        for (const colour of Object.values(wordmarkColours[theme])) {
          expect(contrastRatio(colour, ground), colour).toBeGreaterThanOrEqual(contrastTarget);
        }
      }
    },
  );
});
