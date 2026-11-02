import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk } from '../../../scripts/node-fonts';
import { palette } from '../../shared/palette';
import type { Box } from '../../shared/types';
import { boxSize, fullFrame, sphereBounds, slotRecipes } from '../engine';
import type { BubbleFonts } from '../wordmark/fonts';
import { layoutBanner, type BannerLayout, type BannerOptions } from './framing';
import { layoutGroupContent, strip } from './layout';

let fonts: BubbleFonts;
beforeAll(async () => {
  fonts = await loadBubbleFontsFromDisk();
});

const meetup = (o: Partial<BannerOptions> = {}) =>
  layoutBanner(fonts, { text: 'Tate Modern', theme: 'dark', band: 'off', align: 'left', framing: 'meetup', ...o });
const photo = slotRecipes.find((r) => r.id === 'meetupPhoto');
const safe = photo?.safe;
if (!safe || !photo.edges) throw new Error('The Meetup photo has a safe rectangle and a band');

/** A group-space x or y on the Meetup canvas. */
const onX = (l: BannerLayout, x: number) => l.at.x + x * l.scale;
const onY = (l: BannerLayout, y: number) => l.at.y + y * l.scale;
/** The group's fitted extent on the canvas. */
function placed(l: BannerLayout): Box {
  const { bounds } = layoutGroupContent(fonts, l.options);
  return { minX: onX(l, bounds.minX), minY: onY(l, bounds.minY), maxX: onX(l, bounds.maxX), maxY: onY(l, bounds.maxY) };
}
const glassLeft = (l: BannerLayout) =>
  onX(l, l.content.lockupAt.x + sphereBounds.minX * (l.content.lockup.emblem.size / boxSize));
const wordmarkRight = (l: BannerLayout) => onX(l, l.content.lockupAt.x + l.content.lockup.wordmarkInk.maxX);

describe('the Meetup framing', () => {
  it('is the Meetup photo’s 1200 × 675 canvas, filled with GitHub’s dark page or white so its PNG is opaque', () => {
    expect(meetup().canvas).toEqual({ width: 1200, height: 675 });
    expect(meetup().canvas).toEqual(photo.canvas);
    expect(meetup({ theme: 'dark' }).ground).toBe(palette.darkPage);
    expect(meetup({ theme: 'light' }).ground).toBe(palette.white);
  });

  it.each(['Tate Modern', 'London TypeScript Hackathon', 'A', ''])(
    '“%s”: fills the safe rectangle on its limiting axis and is centred on the other',
    (text) => {
      const layout = meetup({ text, align: 'centre' });
      const box = placed(layout);
      const widthLimited =
        (safe.maxX - safe.minX) / (box.maxX - box.minX) <= (safe.maxY - safe.minY) / (box.maxY - box.minY);
      const [touchMin, touchMax, centreMin, centreMax] = widthLimited
        ? (['minX', 'maxX', 'minY', 'maxY'] as const)
        : (['minY', 'maxY', 'minX', 'maxX'] as const);
      expect(box[touchMin]).toBeCloseTo(safe[touchMin], 6);
      expect(box[touchMax]).toBeCloseTo(safe[touchMax], 6);
      expect((box[centreMin] + box[centreMax]) / 2).toBeCloseTo((safe[centreMin] + safe[centreMax]) / 2, 6);
      expect(box[centreMin]).toBeGreaterThanOrEqual(safe[centreMin] - 1e-6);
      expect(box[centreMax]).toBeLessThanOrEqual(safe[centreMax] + 1e-6);
    },
  );

  it('scales a short text and the lockup up together, beyond their size on the strip', () => {
    const layout = meetup();
    expect(layout.scale).toBeGreaterThan(1.3);
    // The width runs out first for "Tate Modern": the glass on the left edge, the text's ink on the right.
    expect(glassLeft(layout)).toBeCloseTo(safe.minX, 6);
    expect(onX(layout, layout.content.text?.ink.maxX ?? 0)).toBeCloseTo(safe.maxX, 6);
  });

  it('sets the text as the strip does, at its natural size, 56 after the wordmark, on the baseline of “TypeScript”', () => {
    const { content } = meetup({ text: 'London TypeScript Hackathon' });
    const { lockup, lockupAt, text } = content;
    expect(text?.fontSize).toBe(48);
    expect((text?.ink.minX ?? 0) - (lockupAt.x + lockup.wordmarkInk.maxX)).toBeCloseTo(strip.textGap, 9);
    expect(text?.baseline).toBeCloseTo(lockupAt.y + lockup.offset.y + lockup.wordmark.baselines[1], 9);
  });

  it('fits by the glass, the layout box and the text’s ink, leaving the glow to hang below, clear of a bottom band', () => {
    const { bounds, lockup, lockupAt } = layoutGroupContent(fonts, { text: 'Tate Modern', theme: 'dark' });
    expect(bounds.minX).toBeCloseTo(lockupAt.x + sphereBounds.minX * (lockup.emblem.size / boxSize), 9);
    expect(bounds.minY).toBe(lockupAt.y + lockup.box.minY);
    expect(bounds.maxY).toBe(lockupAt.y + lockup.box.maxY);
    for (const text of ['Tate Modern', '']) {
      const layout = meetup({ text, band: 'bottom' });
      const glow = onY(
        layout,
        layout.content.lockupAt.y + (fullFrame.maxY * layout.content.lockup.emblem.size) / boxSize,
      );
      expect(glow, text).toBeLessThanOrEqual(layout.band?.y ?? 0);
    }
  });

  it.each([
    ['left', { x: 0, y: 0, width: 28, height: 675, runs: 'down' }],
    ['bottom', { x: 0, y: 647, width: 1200, height: 28, runs: 'across' }],
  ] as const)(
    'draws a %s band along the photo’s edge at the photo’s own 28, clear of the safe rectangle',
    (band, rect) => {
      const layout = meetup({ band });
      expect(layout.band).toEqual(rect);
      expect(photo.edges?.bandWidth).toBe(28);
      const apart = rect.x + rect.width <= safe.minX || rect.y >= safe.maxY;
      expect(apart).toBe(true);
      // The band is the photo's, so the group is placed as it would be with none.
      expect([layout.at, layout.scale]).toEqual([meetup().at, meetup().scale]);
    },
  );

  it('draws no band when it is off', () => {
    expect(meetup().band).toBeUndefined();
  });

  it('with no text, fits the lockup alone and places it left, centre or right within the safe rectangle’s width', () => {
    const left = meetup({ text: '', align: 'left' });
    const right = meetup({ text: '', align: 'right' });
    const centre = meetup({ text: '', align: 'centre' });
    expect(left.scale).toBeGreaterThan(2);
    expect(right.scale).toBe(left.scale);
    expect(glassLeft(left)).toBeCloseTo(safe.minX, 6);
    expect(wordmarkRight(right)).toBeCloseTo(safe.maxX, 6);
    expect((glassLeft(centre) + wordmarkRight(centre)) / 2).toBeCloseTo((safe.minX + safe.maxX) / 2, 6);
  });

  it('leaves the strip framing transparent and unscaled', () => {
    const stripLayout = layoutBanner(fonts, { text: '', theme: 'light', band: 'off', align: 'left', framing: 'strip' });
    expect(stripLayout.ground).toBeUndefined();
    expect(stripLayout.scale).toBe(1);
    expect(stripLayout.at).toEqual({ x: 0, y: 0 });
  });
});
