import { palette } from '../../shared/palette';
import type { Point } from '../../shared/types';
import { capHeightRatio } from '../../shared/typography';
import { boxSize, sphereBounds, type Theme } from '../engine';
import type { BubbleFonts } from '../wordmark/fonts';
import { layoutBubbleLockup, type BubbleLockup } from '../wordmark/lockup';
import { setBannerText, type BannerTextRun } from './text';

/**
 * The banner: the London TypeScript lockup with optional text beside it.
 * Framework-free; the React renderer draws what this returns.
 */

export const bannerBands = ['off', 'left', 'bottom'] as const;
type BannerBand = (typeof bannerBands)[number];

/** Where the lockup sits when there is no text; with text it is always on the left. */
export const bannerAlignments = ['left', 'centre', 'right'] as const;
type BannerAlign = (typeof bannerAlignments)[number];

export interface StripOptions {
  /** Set beside the lockup; empty (or only spaces) for the lockup alone. */
  text: string;
  theme: Theme;
  band: BannerBand;
  align: BannerAlign;
}

/** The strip's rules, in its own units (CSS px at its natural size). */
export const strip = {
  width: 1200,
  /** The lockup's layout box is half the lockup's 240 reference: 120 high, about 385 wide. */
  emblemSize: 120,
  /** Above and below the lockup's layout box, so the banner doesn't look crammed. */
  margin: 44,
  /** The closest the text's ink may come to the wordmark's before the text shrinks. */
  textGap: 56,
  /** The sunset band: thinner than the Meetup photo's 28, so it stays a stripe on a strip this short. */
  bandWidth: 14,
  /** Between a left band and the bubble's glass, so the band reads as an edge rather than touching the logo. */
  bandGap: 40,
} as const;

export const stripCanvas = { width: strip.width, height: strip.emblemSize + 2 * strip.margin } as const;

/** The text's ink: the wordmark's own on dark; pure black on light, where the thin weight read too grey. */
export const bannerInk = { light: '#000000', dark: palette.darkInk } as const satisfies Record<Theme, string>;

/** What the strip holds, in its own units: everything but the band, which each framing places itself. */
export interface StripContent {
  theme: Theme;
  lockup: BubbleLockup;
  /** Where the lockup's origin, its emblem square's top left, lands. */
  lockupAt: Point;
  text?: BannerTextRun;
  /** The banner's accessible name. */
  title: string;
}

/**
 * The text as the banner sets it: leading and trailing spaces dropped, since
 * they have no ink to align by. Only the plain space (U+0020): a newline, tab
 * or any other character the font can't draw must still reach the glyph
 * check and fail there, never vanish quietly.
 */
export const bannerText = (text: string) => text.replace(/^ +| +$/g, '');

/**
 * Lays out the strip's lockup and text, leaving `inset` clear on the left
 * for a left band. No side margins: the bubble's glass meets the left edge
 * (or the band's gap) and the text's ink ends on the right edge.
 */
export function layoutStripContent(
  fonts: Pick<BubbleFonts, 'wordmark' | 'bannerText'>,
  { text: given, theme, align }: Omit<StripOptions, 'band'>,
  inset: number,
): StripContent {
  const text = bannerText(given);
  const lockup = layoutBubbleLockup(fonts.wordmark, { emblemSize: strip.emblemSize, theme });
  // The glass starts a little inside the emblem's square; that edge, not the square's, is what meets the side.
  const glassLeft = sphereBounds.minX * (lockup.emblem.size / boxSize);
  const inkRight = lockup.wordmarkInk.maxX;
  const placement = text === '' ? align : 'left';
  const x = {
    left: inset - glassLeft,
    right: strip.width - inkRight,
    centre: (inset + strip.width) / 2 - (glassLeft + inkRight) / 2,
  }[placement];
  const lockupAt = { x, y: strip.margin - lockup.box.minY };
  const title = text === '' ? 'London TypeScript' : `London TypeScript: ${text}`;
  if (text === '') return { theme, lockup, lockupAt, title };

  // Capitals as tall as the wordmark's, both from the fonts' own cap heights, on the baseline of "TypeScript".
  const capHeight = capHeightRatio(fonts.wordmark.font) * lockup.wordmark.fontSize;
  const naturalSize = capHeight / capHeightRatio(fonts.bannerText.font);
  const baseline = lockupAt.y + lockup.offset.y + lockup.wordmark.baselines[1];
  const room = strip.width - (lockupAt.x + inkRight) - strip.textGap;
  const set = (x: number, fontSize: number) =>
    setBannerText(fonts.bannerText, text, { x, baseline, fontSize, fill: bannerInk[theme] });
  const natural = set(0, naturalSize);
  const naturalWidth = natural.ink.maxX - natural.ink.minX;
  // Shrinks only when it would crowd the wordmark; the outlines and kerning scale with the size, so the ink does too.
  const fontSize = naturalWidth > room ? naturalSize * (room / naturalWidth) : naturalSize;
  const measured = fontSize === naturalSize ? natural : set(0, fontSize);
  return { theme, lockup, lockupAt, text: set(strip.width - measured.ink.maxX, fontSize), title };
}
