import type { Font, Glyph, PathCommand } from 'opentype.js';
import type { Box, PathShape, Point } from './types';

/** Decimal places kept in generated path data. */
const PRECISION = 2;

export interface PlacedGlyph {
  char: string;
  /** Pen position of the glyph origin. */
  x: number;
  baseline: number;
  d: string;
  bounds: Box;
}

export interface TextRunLayout {
  glyphs: PlacedGlyph[];
  /** Pen position after the last glyph (advance-based, not ink). */
  endX: number;
}

export interface TextRunOptions {
  x: number;
  baseline: number;
  fontSize: number;
  /** Extra space after each glyph, in ems. */
  letterSpacing: number;
  /** Glyph preceding the run, so kerning carries across colour changes. */
  previous?: Glyph;
}

export const emptyBox = (): Box => ({
  minX: Infinity,
  minY: Infinity,
  maxX: -Infinity,
  maxY: -Infinity,
});

export function unionBox(a: Box, b: Box): Box {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function boxOfPoints(points: readonly Point[]): Box {
  return points.reduce<Box>(
    (box, p) => unionBox(box, { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y }),
    emptyBox(),
  );
}

export function translateBox(box: Box, dx: number, dy: number): Box {
  return { minX: box.minX + dx, minY: box.minY + dy, maxX: box.maxX + dx, maxY: box.maxY + dy };
}

function os2(font: Font) {
  const table = font.tables.os2;
  if (!table) throw new Error(`Font ${font.names.fullName?.en ?? ''} has no OS/2 table`);
  return table;
}

/** Ratio of the font's cap height to its em size. */
export function capHeightRatio(font: Font): number {
  return os2(font).sCapHeight / font.unitsPerEm;
}

export function xHeightRatio(font: Font): number {
  return os2(font).sxHeight / font.unitsPerEm;
}

/**
 * Lays out a single line of text as positioned glyph outlines, applying the
 * font's kerning and the requested letter spacing.
 */
export function layoutTextRun(font: Font, text: string, options: TextRunOptions): TextRunLayout {
  const { fontSize, baseline, letterSpacing } = options;
  const scale = fontSize / font.unitsPerEm;
  const glyphs: PlacedGlyph[] = [];
  let x = options.x;
  let previous = options.previous;

  for (const [i, glyph] of font.stringToGlyphs(text).entries()) {
    if (previous) x += font.getKerningValue(previous, glyph) * scale;
    const path = glyph.getPath(x, baseline, fontSize);
    const bb = path.getBoundingBox();
    glyphs.push({
      char: text[i] ?? '',
      x,
      baseline,
      d: commandsToPathData(path.commands),
      bounds: { minX: bb.x1, minY: bb.y1, maxX: bb.x2, maxY: bb.y2 },
    });
    x += (glyph.advanceWidth ?? 0) * scale + letterSpacing * fontSize;
    previous = glyph;
  }

  return { glyphs, endX: x };
}

export function lastGlyph(font: Font, text: string): Glyph | undefined {
  return font.stringToGlyphs(text).at(-1);
}

/** Ink bounds of a set of placed glyphs. */
export function glyphBounds(glyphs: readonly PlacedGlyph[]): Box {
  return glyphs.reduce((box, g) => unionBox(box, g.bounds), emptyBox());
}

// ---------------------------------------------------------------------------
// Flourishes
// ---------------------------------------------------------------------------

/**
 * A curl terminal: a tapered calligraphic stroke that sweeps outwards from
 * a letter, turns down and curls back into a ball. Shape coordinates are in
 * cap heights, with +x pointing away from the letter and +y down.
 */
export const curlShape = {
  /** Cubic Bézier centreline P0..P3. */
  centreline: [
    { x: 0, y: 0 },
    { x: 0.32, y: -0.07 },
    { x: 0.44, y: 0.25 },
    { x: 0.17, y: 0.28 },
  ],
  /** Stroke width at the root and tip of the curl. */
  hairline: 0.045,
  /** Peak stroke width at the outer bend. */
  swell: 0.12,
  ballRadius: 0.11,
  samples: 32,
} as const;

export interface CurlOptions {
  /** Where the curl leaves the letter. */
  origin: Point;
  /** Horizontal direction of the sweep: -1 leftwards, 1 rightwards. */
  direction: -1 | 1;
  /** Length of one cap height, in output units. */
  capHeight: number;
  scale: number;
}

function cubicPoint(p: readonly Point[], t: number): Point {
  const u = 1 - t;
  const [a, b, c, d] = p as [Point, Point, Point, Point];
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  };
}

function cubicTangent(p: readonly Point[], t: number): Point {
  const u = 1 - t;
  const [a, b, c, d] = p as [Point, Point, Point, Point];
  return {
    x: 3 * u * u * (b.x - a.x) + 6 * u * t * (c.x - b.x) + 3 * t * t * (d.x - c.x),
    y: 3 * u * u * (b.y - a.y) + 6 * u * t * (c.y - b.y) + 3 * t * t * (d.y - c.y),
  };
}

/** Fixed-precision number; `+ 0` turns -0 into 0. */
const fmt = (n: number) => (Number(n.toFixed(PRECISION)) + 0).toString();

/**
 * Serialises glyph outline commands. (opentype.js's own `toPathData` drops
 * the separator before values that round from negative to zero.)
 */
export function commandsToPathData(commands: readonly PathCommand[]): string {
  return commands
    .map((c) => {
      switch (c.type) {
        case 'M':
        case 'L':
          return `${c.type}${fmt(c.x)} ${fmt(c.y)}`;
        case 'Q':
          return `Q${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x)} ${fmt(c.y)}`;
        case 'C':
          return `C${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x2)} ${fmt(c.y2)} ${fmt(c.x)} ${fmt(c.y)}`;
        case 'Z':
          return 'Z';
      }
    })
    .join('');
}

export function polygonPath(points: readonly Point[]): string {
  return `M${points.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join('L')}Z`;
}

export function circlePath(centre: Point, r: number): string {
  const { x, y } = centre;
  return `M${fmt(x - r)} ${fmt(y)}A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(x + r)} ${fmt(y)}A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(x - r)} ${fmt(y)}Z`;
}

export interface CurlGeometry {
  stroke: Point[];
  ballCentre: Point;
  ballRadius: number;
  bounds: Box;
}

/** Computes the outline of a curl terminal by offsetting its centreline. */
export function curlGeometry({ origin, direction, capHeight, scale }: CurlOptions): CurlGeometry {
  const unit = capHeight * scale;
  const toWorld = (p: Point): Point => ({
    x: origin.x + p.x * unit * direction,
    y: origin.y + p.y * unit,
  });
  const ctrl = curlShape.centreline.map(toWorld);
  const left: Point[] = [];
  const right: Point[] = [];

  for (let i = 0; i <= curlShape.samples; i++) {
    const t = i / curlShape.samples;
    const p = cubicPoint(ctrl, t);
    const tan = cubicTangent(ctrl, t);
    const len = Math.hypot(tan.x, tan.y) || 1;
    const width =
      unit * (curlShape.hairline + (curlShape.swell - curlShape.hairline) * Math.sin(Math.PI * t));
    const nx = (-tan.y / len) * (width / 2);
    const ny = (tan.x / len) * (width / 2);
    left.push({ x: p.x + nx, y: p.y + ny });
    right.push({ x: p.x - nx, y: p.y - ny });
  }

  const stroke = [...left, ...right.reverse()];
  const ballCentre = ctrl[3] as Point;
  const ballRadius = curlShape.ballRadius * unit;
  const ballBox: Box = {
    minX: ballCentre.x - ballRadius,
    minY: ballCentre.y - ballRadius,
    maxX: ballCentre.x + ballRadius,
    maxY: ballCentre.y + ballRadius,
  };
  return { stroke, ballCentre, ballRadius, bounds: unionBox(boxOfPoints(stroke), ballBox) };
}

export function curlShapes(id: string, fill: string, options: CurlOptions): {
  shapes: PathShape[];
  bounds: Box;
} {
  const curl = curlGeometry(options);
  return {
    shapes: [
      { id: `${id}-stroke`, d: polygonPath(curl.stroke), fill },
      { id: `${id}-ball`, d: circlePath(curl.ballCentre, curl.ballRadius), fill },
    ],
    bounds: curl.bounds,
  };
}
