import type { Box, Point } from '../../shared/types';
import { bandRect, slotRecipes, type BandSide } from '../engine';
import type { BubbleFonts } from '../wordmark/fonts';
import { themeBackgrounds } from '../wordmark/colours';
import {
  layoutGroupContent,
  layoutStripContent,
  strip,
  stripCanvas,
  type BannerAlign,
  type StripContent,
  type StripOptions,
} from './layout';

/**
 * The two framings one renderer draws: the strip alone, and the lockup and
 * text fitted into the Meetup photo's canvas.
 */
export const bannerFramings = ['strip', 'meetup'] as const;
type BannerFraming = (typeof bannerFramings)[number];

export interface BannerOptions extends StripOptions {
  framing: BannerFraming;
}

export interface BannerLayout {
  options: BannerOptions;
  canvas: { width: number; height: number };
  /** A colour fixed into the image, so a PNG of it is opaque; none for the transparent strip. */
  ground?: string;
  /** The sunset band's rectangle on the canvas, and which way its colours run. */
  band?: ReturnType<typeof bandRect>;
  /** The lockup and text, placed on the canvas by `at` and `scale`. */
  content: StripContent;
  at: Point;
  scale: number;
}

/** The Meetup photo's recipe: its canvas, safe rectangle and band, shared with the slot it draws. */
function meetupPhoto() {
  const recipe = slotRecipes.find((r) => r.id === 'meetupPhoto');
  if (!recipe?.canvas || !recipe.safe || !recipe.edges)
    throw new Error('The Meetup photo has a canvas, safe area and band');
  return { canvas: recipe.canvas, safe: recipe.safe, bandWidth: recipe.edges.bandWidth };
}

/**
 * The largest scale that fits `content` in `box`, and where that puts the
 * content's origin: centred vertically, and placed left, centre or right
 * within the box's width.
 */
function fit(content: Box, box: Box, align: BannerAlign) {
  const width = content.maxX - content.minX;
  const height = content.maxY - content.minY;
  const scale = Math.min((box.maxX - box.minX) / width, (box.maxY - box.minY) / height);
  const left = {
    left: box.minX,
    centre: (box.minX + box.maxX - width * scale) / 2,
    right: box.maxX - width * scale,
  }[align];
  const top = (box.minY + box.maxY - height * scale) / 2;
  return { scale, at: { x: left - content.minX * scale, y: top - content.minY * scale } };
}

/**
 * Lays out a banner in its framing.
 *
 * - **strip:** 1200 × 208 and transparent; a left band keeps the lockup
 *   `bandGap` clear of it.
 * - **meetup:** a 1200 × 675 canvas filled with the theme's page (GitHub's
 *   dark page, or white). The lockup and text, as one group with no empty
 *   middle, are scaled together to fill the Meetup photo's safe rectangle
 *   on whichever axis runs out first, and centred on the other; with no
 *   text, the alignment places the lockup within the rectangle's width. The
 *   band runs along the photo's own edge at the photo's own width, as the
 *   Meetup photo's band is drawn.
 */
export function layoutBanner(
  fonts: Pick<BubbleFonts, 'wordmark' | 'bannerText'>,
  options: BannerOptions,
): BannerLayout {
  const { band } = options;
  const side: BandSide | undefined = band === 'off' ? undefined : band;
  if (options.framing === 'strip') {
    const inset = side === 'left' ? strip.bandWidth + strip.bandGap : 0;
    return {
      options,
      canvas: stripCanvas,
      band: side && bandRect(stripCanvas, side, strip.bandWidth),
      content: layoutStripContent(fonts, options, inset),
      at: { x: 0, y: 0 },
      scale: 1,
    };
  }
  const photo = meetupPhoto();
  const content = layoutGroupContent(fonts, options);
  return {
    options,
    canvas: photo.canvas,
    ground: themeBackgrounds[options.theme],
    band: side && bandRect(photo.canvas, side, photo.bandWidth),
    content,
    ...fit(content.bounds, photo.safe, content.text ? 'centre' : options.align),
  };
}
