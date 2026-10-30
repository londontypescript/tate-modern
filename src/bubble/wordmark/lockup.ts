import type { Box, Point } from '../../shared/types';
import { translateBox } from '../../shared/typography';
import type { Theme } from './colours';
import type { KernedFont } from './fonts';
import { buildBubbleWordmark, type BubbleWordmark } from './wordmark';

/**
 * The reference lockup's proportions, relative to the emblem's size: the
 * side of the square the emblem is drawn in (its 240 box, not the sphere,
 * which is 224/240 of it).
 */
const lockupRatios = {
  /** Text size: 22.4 at a 56 emblem. */
  textSize: 0.4,
  /** Space between the emblem's box and the first pen position: 10 at 56. */
  gap: 10 / 56,
} as const;

export interface BubbleLockup {
  /** The emblem's square, top left at the origin. */
  emblem: { x: number; y: number; size: number };
  wordmark: BubbleWordmark;
  /** Translation from wordmark space into the lockup's space. */
  offset: Point;
  /** The wordmark's ink bounds in the lockup's space. */
  wordmarkInk: Box;
  /** The emblem's box and the wordmark's line boxes together. */
  box: Box;
}

/**
 * Sets the stacked wordmark beside an emblem of side `emblemSize`, as the
 * reference lockup does in CSS: the emblem, then the gap, then the two
 * lines, centred on the emblem vertically.
 */
export function layoutBubbleLockup(
  font: KernedFont,
  { emblemSize, theme }: { emblemSize: number; theme: Theme },
): BubbleLockup {
  const wordmark = buildBubbleWordmark(font, { fontSize: lockupRatios.textSize * emblemSize, theme });
  const textHeight = wordmark.box.maxY - wordmark.box.minY;
  const offset = { x: emblemSize + lockupRatios.gap * emblemSize, y: (emblemSize - textHeight) / 2 };
  const text = translateBox(wordmark.box, offset.x, offset.y);
  return {
    emblem: { x: 0, y: 0, size: emblemSize },
    wordmark,
    offset,
    wordmarkInk: translateBox(wordmark.inkBounds, offset.x, offset.y),
    box: { minX: 0, minY: Math.min(0, text.minY), maxX: text.maxX, maxY: Math.max(emblemSize, text.maxY) },
  };
}
