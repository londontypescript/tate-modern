import type { Box } from '../../shared/types';
import type { Detail } from './detail';
import type { Theme } from './types';
import { emblemLooks, pane, panes } from './emblem';

/**
 * The bubble's boxes, kept apart because each answers a different question:
 * the sphere (what to align by), where it paints, and the frame a file
 * shows. All are in the drawing's 240-unit box.
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
 * Where each theme's ground stops painting: its last visible row as resvg
 * renders it, rounded up to a whole unit. Dark's caustic ends at about
 * y 252.4 (at 8 px per unit): its ellipse ends at 241.5, and its gradient
 * fades to clear before the blur's three standard deviations (256.5) would
 * suggest. Light's navy shadow ends at about y 246, a little lower at
 * coarse pixel sizes (247 at 1 px per unit).
 */
const groundBottom: Record<Theme, number> = { light: 247, dark: 253 };

/**
 * Everything the full bubble paints in a theme: the sphere with its outer
 * rim stroke (half of its 1-unit width outside r 112), and the ground below.
 */
export const paintedBounds = (theme: Theme): Box => ({
  minX: sphere.cx - sphere.r - 0.5,
  minY: sphere.cy - sphere.r - 0.5,
  maxX: sphere.cx + sphere.r + 0.5,
  maxY: groundBottom[theme],
});

/** The square the smaller steps are framed in: the 240 box, as the reference. */
export const squareFrame: Box = { minX: 0, minY: 0, maxX: boxSize, maxY: boxSize };

/**
 * The full bubble's frame: the 240 box grown downwards only, so the ground
 * fades out inside it instead of ending in a straight line at the box's
 * edge. The same in both themes, so a light and dark pair swap without the
 * page moving. The sphere keeps its place and size, and everything that
 * places the bubble still goes by the 240 box: the extra room hangs below.
 */
export const fullFrame: Box = { minX: 0, minY: 0, maxX: boxSize, maxY: Math.max(...Object.values(groundBottom)) };

/**
 * The sphere's diameter when its frame is shown `frameWidth` CSS pixels
 * wide. Every frame is the 240 box's width, however tall.
 */
export const sphereDiameterInFrame = (frameWidth: number) => (frameWidth * 2 * sphere.r) / boxSize;

/**
 * How far the fan reaches from the centre once its emblem is scaled by
 * `core`: each pane is a rounded square turned about the centre, so along
 * either axis it reaches its corner circle's centre, (size / 2 - rx) ×
 * (|cos| + |sin|) of its turn, plus rx. A square turned by any angle reaches
 * the same distance along x and y.
 */
function fanReach(core: number) {
  const half = pane.size / 2 - pane.rx;
  const reach = Math.max(
    ...panes.map(({ rotate }) => {
      const turn = (rotate * Math.PI) / 180;
      return half * (Math.abs(Math.cos(turn)) + Math.abs(Math.sin(turn))) + pane.rx;
    }),
  );
  return reach * core;
}

/**
 * Each step's three boxes. Every step is aligned by the same sphere, so a
 * swap at a breakpoint keeps the logo's centre and size; the steps without
 * a bubble grow their fan to fill most of that circle instead. `painted` is
 * where the step actually paints: small's rim ends at the sphere's edge, and
 * the bare fan stays inside it, so only the full bubble's ground passes the
 * square and needs the taller `frame`, the same in both themes.
 */
export function stepBounds(detail: Detail, theme: Theme): { align: Box; painted: Box; frame: Box } {
  switch (detail) {
    case 'full':
      return { align: sphereBounds, painted: paintedBounds(theme), frame: fullFrame };
    case 'small':
      return { align: sphereBounds, painted: sphereBounds, frame: squareFrame };
    case 'tiny':
    case 'none': {
      const reach = fanReach(emblemLooks[detail].core);
      const painted = {
        minX: sphere.cx - reach,
        minY: sphere.cy - reach,
        maxX: sphere.cx + reach,
        maxY: sphere.cy + reach,
      };
      return { align: sphereBounds, painted, frame: squareFrame };
    }
  }
}
