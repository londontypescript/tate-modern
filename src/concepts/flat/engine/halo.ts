/**
 * The tile's halo: a soft navy shadow under the tile, so it looks lifted
 * off the sheets. It is the tile's rounded outline moved left and down,
 * solid inside, with a soft edge `reach` wide all round. The offset makes
 * it strongest on the left and bottom and faint on the top and right, and
 * having no free ends it never stops in a hard edge.
 *
 * It is drawn without SVG filters: one navy shape through a luminance mask
 * built from nine opaque grey pieces, a white core, four strips with linear
 * gradients and four quarter-disc corners with radial ones. The strips
 * overlap their neighbours slightly, so anti-aliasing at the joins never
 * leaves a pale line (opaque grey over opaque grey doesn't compound).
 *
 * Plain data only: no React, no DOM.
 */
import { palette, type Box, type Point } from '../../../shared';
import { clampCornerRadius } from './bounds';
import { haloRanges, neutralHalo, type HaloConfig, type TileConfig } from './config';

/**
 * One stop of the soft edge: `offset` along a piece's depth (0..1), the
 * mask's level there (1 = the full strength, 0 = clear) and that level as
 * the 8-bit grey the mask is written with.
 */
interface HaloStop {
  offset: number;
  level: number;
  grey: string;
}

type HaloSide = 'left' | 'right' | 'top' | 'bottom';
type HaloCorner = 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';

/**
 * A soft edge along one side of the core, graded from `from` (the core's
 * edge) to `to` (clear). `rect` is its share of the halo; `paint` is what
 * is drawn, `rect` grown over the core and into both neighbouring corners.
 */
interface HaloStrip {
  side: HaloSide;
  rect: Box;
  paint: Box;
  from: Point;
  to: Point;
}

/**
 * A quarter disc about a core corner, in the outward quadrant: from the
 * centre along a horizontal radius to `start`, round the arc to `end`, and
 * back up or down the vertical radius. Its radii are its written depths,
 * `rx` across and `ry` down, so the arc ends exactly on the written lines;
 * they differ by at most a rounding step. Graded outward from the centre
 * over `radius`.
 */
interface HaloPatch {
  corner: HaloCorner;
  centre: Point;
  rx: number;
  ry: number;
  radius: number;
  start: Point;
  end: Point;
  /** Whether the arc from `start` to `end` turns clockwise (SVG's sweep flag). */
  clockwise: boolean;
}

export interface HaloModel {
  colour: string;
  /** Opacity of the shadow where the mask is white. */
  strength: number;
  /** The white core: the moved tile less its rounded corners. */
  core: Box;
  strips: HaloStrip[];
  patches: HaloPatch[];
  /** The one stop list every strip and corner uses, so they match at equal distances. */
  stops: HaloStop[];
  /** Exact bounds of the halo, as written, and the area of its mask. */
  box: Box;
}

const fields = Object.keys(haloRanges) as (keyof HaloConfig)[];
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Halo settings safe to draw, whatever arrives: a saved configuration is
 * untrusted, and the halo checks its own input rather than relying on the
 * caller. A value that isn't a finite number takes its neutral value, every
 * value is clamped to its slider's range, and anything that isn't an
 * object is the neutral (absent) halo.
 */
export function sanitizeHalo(input: unknown): HaloConfig {
  const from = isObject(input) ? input : {};
  const out = { ...neutralHalo };
  for (const key of fields) {
    const value = from[key];
    if (finite(value)) out[key] = clamp(value, haloRanges[key].min, haloRanges[key].max);
  }
  return out;
}

/** Where the soft edge reaches each level: five stops through the curve (1 − t)². */
const curve = [0, 0.25, 0.5, 0.75, 1];

/** Rounded as the renderer writes coordinates (`num`), so the model is the written geometry. */
const written = (v: number) => Number(v.toFixed(3));
const writtenAll = (...vs: [number, number, number, number]) => vs.map(written) as [number, number, number, number];
const greyOf = (level: number) =>
  `#${Math.round(level * 255)
    .toString(16)
    .padStart(2, '0')
    .repeat(3)}`;

/**
 * The halo for a tile centred on the origin, or nothing when it is off
 * (strength or reach 0). The tile's size and corner radius aren't checked
 * anywhere else yet, so a halo is only drawn when the size is finite and
 * positive and the corner radius finite and not negative.
 */
export function buildHalo(tile: Pick<TileConfig, 'size' | 'cornerRadius' | 'halo'>): HaloModel | undefined {
  const { strength, reach, offset } = sanitizeHalo(tile.halo);
  const { size, cornerRadius } = tile;
  if (strength === 0 || reach === 0) return undefined;
  if (!finite(size) || !finite(cornerRadius) || size <= 0 || cornerRadius < 0) return undefined;

  const r = clampCornerRadius(size, cornerRadius);
  const a = size / 2 - r;
  const R = r + reach;
  const [ox, oy] = [-offset, offset];
  // Four lines each way, rounded once as they are written; every piece is
  // built from these written numbers, so neighbours share coordinates exactly.
  const [x0, x1, x2, x3] = writtenAll(ox - a - R, ox - a, ox + a, ox + a + R);
  const [y0, y1, y2, y3] = writtenAll(oy - a - R, oy - a, oy + a, oy + a + R);
  // Before its first stop a strip's gradient is white, so growing it over the
  // core changes nothing. Along its edge it is graded by the distance across
  // rather than from the corner: the two differ by at most `lapAlong` in
  // distance, and the curve's steepest stretch loses 1.75 / reach of level per
  // unit, so reach / 64 (or 0.5 once the reach passes 32) keeps the error
  // within 1.75 / 64 < 1 / 32 of the strength. It is rounded down to the
  // written precision, so writing it never lengthens it past that budget; a
  // reach under 0.064 gets no lap along its edges at all.
  const lapIn = Math.min(0.5, a);
  const lapAlong = Math.floor(Math.min(0.5, reach / 64) * 1000) / 1000;
  const [inL, inR, inT, inB] = writtenAll(x1 + lapIn, x2 - lapIn, y1 + lapIn, y2 - lapIn);
  const [alongL, alongR, alongT, alongB] = writtenAll(x1 - lapAlong, x2 + lapAlong, y1 - lapAlong, y2 + lapAlong);
  const rect = (minX: number, minY: number, maxX: number, maxY: number): Box => ({ minX, minY, maxX, maxY });
  const at = (x: number, y: number): Point => ({ x, y });
  const patch = (corner: HaloCorner, centre: Point, start: Point, end: Point, clockwise: boolean): HaloPatch => {
    const [rx, ry] = [written(Math.abs(start.x - centre.x)), written(Math.abs(end.y - centre.y))];
    return { corner, centre, rx, ry, radius: Math.max(rx, ry), start, end, clockwise };
  };

  return {
    colour: palette.navy,
    strength,
    core: rect(x1, y1, x2, y2),
    strips: [
      {
        side: 'left',
        rect: rect(x0, y1, x1, y2),
        paint: rect(x0, alongT, inL, alongB),
        from: at(x1, y1),
        to: at(x0, y1),
      },
      {
        side: 'right',
        rect: rect(x2, y1, x3, y2),
        paint: rect(inR, alongT, x3, alongB),
        from: at(x2, y1),
        to: at(x3, y1),
      },
      {
        side: 'top',
        rect: rect(x1, y0, x2, y1),
        paint: rect(alongL, y0, alongR, inT),
        from: at(x1, y1),
        to: at(x1, y0),
      },
      {
        side: 'bottom',
        rect: rect(x1, y2, x2, y3),
        paint: rect(alongL, inB, alongR, y3),
        from: at(x1, y2),
        to: at(x1, y3),
      },
    ],
    patches: [
      patch('top-left', at(x1, y1), at(x0, y1), at(x1, y0), true),
      patch('top-right', at(x2, y1), at(x3, y1), at(x2, y0), false),
      patch('bottom-right', at(x2, y2), at(x3, y2), at(x2, y3), true),
      patch('bottom-left', at(x1, y2), at(x0, y2), at(x1, y3), false),
    ],
    stops: curve.map((t) => ({ offset: (r + t * reach) / R, level: (1 - t) ** 2, grey: greyOf((1 - t) ** 2) })),
    box: rect(x0, y0, x3, y3),
  };
}
