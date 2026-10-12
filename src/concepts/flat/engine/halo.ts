/**
 * The tile's halo: a soft navy shadow under the tile, so it looks lifted
 * off the sheets. It is the tile's rounded outline moved left and down,
 * solid inside, with a soft edge `reach` wide all round, drawn without SVG
 * filters as nine pieces that meet edge to edge: a flat core, four strips
 * with linear gradients and four quarter-disc corners with radial ones.
 * The offset makes it strongest on the left and bottom and faint on the top
 * and right, and having no free ends it never stops in a hard edge.
 *
 * Plain data only: no React, no DOM.
 */
import { palette, type Box, type Point } from '../../../shared';
import { clampCornerRadius } from './bounds';
import { haloRanges, neutralHalo, type HaloConfig, type TileConfig } from './config';

/** One stop of the soft edge: `offset` along a piece's depth (0..1), and its opacity. */
interface HaloStop {
  offset: number;
  opacity: number;
}

type HaloSide = 'left' | 'right' | 'top' | 'bottom';
type HaloCorner = 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';

/** A soft edge along one side of the core, graded from `from` (the core) to `to` (clear). */
interface HaloStrip {
  side: HaloSide;
  rect: Box;
  from: Point;
  to: Point;
}

/**
 * A quarter disc about a core corner, in the outward quadrant: from the
 * centre along a horizontal radius to `start`, round the arc to `end`, and
 * back up or down the vertical radius. Graded outward from the centre.
 */
interface HaloPatch {
  corner: HaloCorner;
  centre: Point;
  radius: number;
  start: Point;
  end: Point;
  /** Whether the arc from `start` to `end` turns clockwise (SVG's sweep flag). */
  clockwise: boolean;
}

export interface HaloModel {
  colour: string;
  /** Opacity of the core, and of every piece within the moved tile's outline. */
  strength: number;
  core: Box;
  strips: HaloStrip[];
  patches: HaloPatch[];
  /** The one stop list every strip and corner uses, so they match at equal distances. */
  stops: HaloStop[];
  /** Exact bounds of the halo. */
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

/** Where the soft edge reaches each opacity: five stops through the curve (1 − t)². */
const curve = [0, 0.25, 0.5, 0.75, 1];

/**
 * The halo for a tile centred on the origin, or nothing when it is off
 * (strength or reach 0). The tile's size and corner radius aren't checked
 * anywhere else yet, so a halo is only drawn when both are finite and
 * positive.
 */
export function buildHalo(tile: Pick<TileConfig, 'size' | 'cornerRadius' | 'halo'>): HaloModel | undefined {
  const { strength, reach, offset } = sanitizeHalo(tile.halo);
  const { size, cornerRadius } = tile;
  if (strength === 0 || reach === 0) return undefined;
  if (!finite(size) || !finite(cornerRadius) || size <= 0 || cornerRadius <= 0) return undefined;

  const r = clampCornerRadius(size, cornerRadius);
  const a = size / 2 - r;
  const R = r + reach;
  const [ox, oy] = [-offset, offset];
  // Every piece is built from these four lines each way, so neighbours
  // share exactly the same coordinates.
  const [x1, x2, y1, y2] = [ox - a, ox + a, oy - a, oy + a];
  const [x0, x3, y0, y3] = [x1 - R, x2 + R, y1 - R, y2 + R];
  const rect = (minX: number, minY: number, maxX: number, maxY: number): Box => ({ minX, minY, maxX, maxY });
  const at = (x: number, y: number): Point => ({ x, y });

  return {
    colour: palette.navy,
    strength,
    core: rect(x1, y1, x2, y2),
    strips: [
      { side: 'left', rect: rect(x0, y1, x1, y2), from: at(x1, y1), to: at(x0, y1) },
      { side: 'right', rect: rect(x2, y1, x3, y2), from: at(x2, y1), to: at(x3, y1) },
      { side: 'top', rect: rect(x1, y0, x2, y1), from: at(x1, y1), to: at(x1, y0) },
      { side: 'bottom', rect: rect(x1, y2, x2, y3), from: at(x1, y2), to: at(x1, y3) },
    ],
    patches: [
      { corner: 'top-left', centre: at(x1, y1), radius: R, start: at(x0, y1), end: at(x1, y0), clockwise: true },
      { corner: 'top-right', centre: at(x2, y1), radius: R, start: at(x3, y1), end: at(x2, y0), clockwise: false },
      { corner: 'bottom-right', centre: at(x2, y2), radius: R, start: at(x3, y2), end: at(x2, y3), clockwise: true },
      { corner: 'bottom-left', centre: at(x1, y2), radius: R, start: at(x0, y2), end: at(x1, y3), clockwise: false },
    ],
    stops: curve.map((t) => ({ offset: (r + t * reach) / R, opacity: strength * (1 - t) ** 2 })),
    box: rect(x0, y0, x3, y3),
  };
}
