import type { PathCommand } from 'opentype.js';
import type { Point } from './types';

/**
 * Measurements taken from glyph outlines, so flourishes can join the real
 * strokes of a letter instead of guessed positions.
 */

export type Contour = Point[];

interface Interval {
  start: number;
  end: number;
}

/** Points per curve segment when flattening outlines for measurement. */
const CURVE_STEPS = 24;

/** Flattens glyph path commands into closed polygons. */
export function flattenCommands(commands: readonly PathCommand[]): Contour[] {
  const contours: Contour[] = [];
  let current: Contour = [];
  let pen: Point = { x: 0, y: 0 };

  for (const c of commands) {
    if (c.type === 'M') {
      if (current.length > 0) contours.push(current);
      current = [{ x: c.x, y: c.y }];
      pen = { x: c.x, y: c.y };
    } else if (c.type === 'L') {
      pen = { x: c.x, y: c.y };
      current.push(pen);
    } else if (c.type === 'Q' || c.type === 'C') {
      const p0 = pen;
      for (let i = 1; i <= CURVE_STEPS; i++) {
        const t = i / CURVE_STEPS;
        const u = 1 - t;
        current.push(
          c.type === 'Q'
            ? {
                x: u * u * p0.x + 2 * u * t * c.x1 + t * t * c.x,
                y: u * u * p0.y + 2 * u * t * c.y1 + t * t * c.y,
              }
            : {
                x: u * u * u * p0.x + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
                y: u * u * u * p0.y + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y,
              },
        );
      }
      pen = { x: c.x, y: c.y };
    } else if (current.length > 0) {
      contours.push(current);
      current = [];
    }
  }
  if (current.length > 0) contours.push(current);
  return contours;
}

/**
 * Where a horizontal (axis 'x') or vertical (axis 'y') line crosses the
 * outline, paired into the intervals that lie inside the glyph.
 */
function scan(contours: readonly Contour[], axis: 'x' | 'y', at: number): Interval[] {
  const across = axis === 'x' ? 'y' : 'x';
  const hits: number[] = [];
  for (const contour of contours) {
    for (let i = 0; i < contour.length; i++) {
      const p = contour[i] as Point;
      const q = contour[(i + 1) % contour.length] as Point;
      if (p[across] <= at === q[across] <= at) continue;
      const t = (at - p[across]) / (q[across] - p[across]);
      hits.push(p[axis] + t * (q[axis] - p[axis]));
    }
  }
  hits.sort((a, b) => a - b);
  const intervals: Interval[] = [];
  for (let i = 0; i + 1 < hits.length; i += 2) {
    intervals.push({ start: hits[i] as number, end: hits[i + 1] as number });
  }
  return intervals;
}

/** Inside intervals along the horizontal line at `y`, left to right. */
const scanRow = (contours: readonly Contour[], y: number) => scan(contours, 'x', y);

/** Inside intervals along the vertical line at `x`, top to bottom. */
const scanColumn = (contours: readonly Contour[], x: number) => scan(contours, 'y', x);

/** Where a flourish leaves a horizontal stroke such as a serif or crossbar. */
export interface StrokeJoin {
  /** Centre of the stroke where the flourish begins, just inside the tip. */
  origin: Point;
  /** Stroke thickness at `origin`. */
  thickness: number;
  /** y of the stroke's top edge at `origin`. */
  top: number;
}

/**
 * Measures the end of a horizontal stroke crossing the line at `y`: the
 * leftmost or rightmost stroke on that line is followed to its tip, then
 * measured `overlap` back inside the glyph, where the flourish takes over.
 */
export function horizontalStrokeEnd(
  contours: readonly Contour[],
  y: number,
  side: 'left' | 'right',
  overlap: number,
): StrokeJoin | undefined {
  const row = scanRow(contours, y);
  const stroke = side === 'left' ? row[0] : row.at(-1);
  if (!stroke) return undefined;
  const x = side === 'left' ? stroke.start + overlap : stroke.end - overlap;
  const section = scanColumn(contours, x).find((s) => s.start <= y && y <= s.end);
  if (!section) return undefined;
  return {
    origin: { x, y: (section.start + section.end) / 2 },
    thickness: section.end - section.start,
    top: section.start,
  };
}

/**
 * Finds a crossbar to the right of a vertical stem: the highest stroke
 * crossing the column just outside the stem's right edge at `stemY`.
 */
export function crossbarRight(
  contours: readonly Contour[],
  stemY: number,
  probe: number,
  overlap: number,
): StrokeJoin | undefined {
  const stem = scanRow(contours, stemY).at(-1);
  if (!stem) return undefined;
  const bar = scanColumn(contours, stem.end + probe)[0];
  if (!bar || bar.start >= stemY) return undefined;
  return horizontalStrokeEnd(contours, (bar.start + bar.end) / 2, 'right', overlap);
}
