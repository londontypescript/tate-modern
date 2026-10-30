import { Resvg } from '@resvg/resvg-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { palette } from '../../shared/palette';
import { standaloneSvg } from '../../shared/react/standaloneSvg';
import { unionBox } from '../../shared/typography';
import { wordmarkColours } from '../wordmark/colours';
import { contrastRatio, contrastTarget } from '../wordmark/contrast';
import type { KernedFont } from '../wordmark/fonts';
import { layoutBubbleLockup } from '../wordmark/lockup';
import {
  buildBubble,
  detailForDiameter,
  slotRecipes,
  sphereDiameterInFrame,
  tileLettering,
  type Detail,
  type Node,
  type SlotRecipe,
} from '../engine';
import { contrastAgainstGround, contrastOver } from './measureContrast';
import { SlotSvg } from './SlotSvg';

let lettering: string;
let font: KernedFont;
beforeAll(async () => {
  lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
  font = (await loadBubbleFontsFromDisk()).wordmark;
});

const images = slotRecipes.filter((r): r is SlotRecipe & { detail: Detail } => r.detail !== 'bySize');

/** The content's box (the emblem's square, or the lockup's) in canvas units. */
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
