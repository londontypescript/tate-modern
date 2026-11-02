import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk } from '../../../scripts/node-fonts';
import { palette } from '../../shared/palette';
import { boxSize, sphereBounds, slotRecipes } from '../engine';
import type { BubbleFonts } from '../wordmark/fonts';
import { layoutBanner, type BannerLayout, type BannerOptions } from './framing';

let fonts: BubbleFonts;
beforeAll(async () => {
  fonts = await loadBubbleFontsFromDisk();
});

const meetup = (o: Partial<BannerOptions> = {}) =>
  layoutBanner(fonts, { text: 'Tate Modern', theme: 'dark', band: 'off', align: 'left', framing: 'meetup', ...o });
const photo = slotRecipes.find((r) => r.id === 'meetupPhoto');
const safe = photo?.safe;
if (!safe || !photo.edges) throw new Error('The Meetup photo has a safe rectangle and a band');

/** A strip-space x on the Meetup canvas. */
const onCanvas = (layout: BannerLayout, x: number) => layout.at.x + x * layout.scale;
const glassLeft = (l: BannerLayout) =>
  onCanvas(l, l.content.lockupAt.x + sphereBounds.minX * (l.content.lockup.emblem.size / boxSize));
const inkRight = (l: BannerLayout) =>
  onCanvas(l, l.content.text?.ink.maxX ?? l.content.lockupAt.x + l.content.lockup.wordmarkInk.maxX);

describe('the Meetup framing', () => {
  it('is the Meetup photo’s 1200 × 675 canvas, filled with GitHub’s dark page or white so its PNG is opaque', () => {
    expect(meetup().canvas).toEqual({ width: 1200, height: 675 });
    expect(meetup().canvas).toEqual(photo.canvas);
    expect(meetup({ theme: 'dark' }).ground).toBe(palette.darkPage);
    expect(meetup({ theme: 'light' }).ground).toBe(palette.white);
  });

  it('fits the whole strip inside the photo’s safe rectangle, x 120 to 1080, centred', () => {
    const layout = meetup();
    expect(layout.scale).toBeCloseTo(960 / 1200, 9);
    expect(layout.at.x).toBeCloseTo(120, 9);
    expect(layout.at.x + 1200 * layout.scale).toBeCloseTo(1080, 9);
    const top = layout.at.y;
    const bottom = layout.at.y + 208 * layout.scale;
    expect(top).toBeGreaterThanOrEqual(safe.minY);
    expect(bottom).toBeLessThanOrEqual(safe.maxY);
    expect((top + bottom) / 2).toBeCloseTo((safe.minY + safe.maxY) / 2, 9);
  });

  it('keeps the strip’s own rules inside: the glass on the safe rectangle’s left edge, the text’s ink on its right', () => {
    const layout = meetup();
    expect(glassLeft(layout)).toBeCloseTo(120, 9);
    expect(inkRight(layout)).toBeCloseTo(1080, 6);
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
      const b = rect;
      const apart = b.x + b.width <= safe.minX || b.y >= safe.maxY;
      expect(apart).toBe(true);
      // The band is the photo's, so the strip inside lays out as it would with none.
      expect(layout.content.lockupAt).toEqual(meetup().content.lockupAt);
    },
  );

  it('draws no band when it is off', () => {
    expect(meetup().band).toBeUndefined();
  });

  it('takes the same alignment as the strip when there is no text', () => {
    expect(glassLeft(meetup({ text: '', align: 'left' }))).toBeCloseTo(120, 9);
    expect(inkRight(meetup({ text: '', align: 'right' }))).toBeCloseTo(1080, 9);
    const centre = meetup({ text: '', align: 'centre' });
    expect((glassLeft(centre) + inkRight(centre)) / 2).toBeCloseTo(600, 9);
  });

  it('leaves the strip framing transparent and unscaled', () => {
    const strip = layoutBanner(fonts, { text: '', theme: 'light', band: 'off', align: 'left', framing: 'strip' });
    expect(strip.ground).toBeUndefined();
    expect(strip.scale).toBe(1);
    expect(strip.at).toEqual({ x: 0, y: 0 });
  });
});
