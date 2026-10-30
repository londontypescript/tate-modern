import type { Box } from '../../shared/types';

/**
 * The bubble's three boxes, kept apart because each answers a different
 * question. All are in the drawing's 240-unit box.
 */

/** The side of the box the bubble is drawn in, as the reference's 240 symbol. */
export const boxSize = 240;

/** The glass sphere: what to align the bubble by (centring, optical size). */
export const sphere = { cx: 120, cy: 120, r: 112 } as const;

/** The sphere's box, without its rim stroke. */
export const sphereBounds: Box = {
  minX: sphere.cx - sphere.r,
  minY: sphere.cy - sphere.r,
  maxX: sphere.cx + sphere.r,
  maxY: sphere.cy + sphere.r,
};

/**
 * Everything that paints: the sphere with its outer rim stroke (half of its
 * 1-unit width outside r 112), and the ground shadow's ellipse (cy 230, ry 7)
 * spread by its blur. The blur is counted to three standard deviations
 * (3 × 4), past where it fades below one 8-bit step; resvg measured the
 * reference's last visible row at about y 246.
 */
export const paintedBounds: Box = {
  minX: sphere.cx - sphere.r - 0.5,
  minY: sphere.cy - sphere.r - 0.5,
  maxX: sphere.cx + sphere.r + 0.5,
  maxY: 230 + 7 + 3 * 4,
};

/**
 * The square an emblem file frames: the 240 box, as the reference. It clips
 * the faint bottom of the shadow's blur, as the exploration's symbol did.
 */
export const squareFrame: Box = { minX: 0, minY: 0, maxX: boxSize, maxY: boxSize };

/** The sphere's diameter when its square frame is shown `frameSize` CSS pixels wide. */
export const sphereDiameterInFrame = (frameSize: number) => (frameSize * 2 * sphere.r) / boxSize;
