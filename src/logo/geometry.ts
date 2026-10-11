import type { Font } from 'opentype.js';
import type { EmblemConfig, FacetShading, LogoConfig, TileConfig, WordmarkConfig } from './config';
import type { LogoFonts } from './fonts';
import { palette } from './config';
import type {
  Box,
  EmblemModel,
  LogoModel,
  PathShape,
  Point,
  SquareLayer,
  TileModel,
  WordmarkModel,
} from './types';
import {
  capHeightRatio,
  curlShapes,
  emptyBox,
  glyphBounds,
  layoutTextRun,
  translateBox,
  unionBox,
  xHeightRatio,
  type PlacedGlyph,
} from './typography';
import { crossbarRight, flattenCommands, horizontalStrokeEnd, type StrokeJoin } from './outline';

const DEG = Math.PI / 180;

// ---------------------------------------------------------------------------
// Background squares
// ---------------------------------------------------------------------------

/** Corner radius limited to what a square of the given size can hold. */
export const clampCornerRadius = (size: number, radius: number) =>
  Math.min(Math.max(radius, 0), size / 2);

/**
 * The rotating background squares, back to front. Each is centred on the
 * emblem origin, rotated `initialRotation + index * rotationIncrement` and
 * scaled linearly by `sizeTaper` from the back layer to the front one.
 */
export function generateLayers(config: EmblemConfig): SquareLayer[] {
  const count = Math.max(0, Math.floor(config.layerCount));
  const colours = config.colours.length > 0 ? config.colours : [palette.blue];
  return Array.from({ length: count }, (_, index) => {
    const depth = count > 1 ? index / (count - 1) : 0;
    const size = config.squareSize * (1 - config.sizeTaper * depth);
    return {
    id: `layer-${index}`,
    index,
    size,
    rotation: config.initialRotation + index * config.rotationIncrement,
    cornerRadius: clampCornerRadius(size, config.cornerRadius),
    fill: colours[index % colours.length] as string,
    opacity: config.opacity,
    blendMode: config.blendMode,
    };
  });
}

/**
 * Half-width of the axis-aligned box around a rounded square rotated by
 * `rotation` degrees about its centre. The straight part of the square
 * contributes (s/2 - r)(|cos θ| + |sin θ|); the corner arcs add r.
 */
export function rotatedHalfExtent(size: number, cornerRadius: number, rotation: number): number {
  const r = clampCornerRadius(size, cornerRadius);
  const theta = rotation * DEG;
  return (size / 2 - r) * (Math.abs(Math.cos(theta)) + Math.abs(Math.sin(theta))) + r;
}

/** Distance from the centre to the furthest point of a rounded square. */
export function rotationSafeRadius(size: number, cornerRadius: number): number {
  const r = clampCornerRadius(size, cornerRadius);
  return (size / 2 - r) * Math.SQRT2 + r;
}

const squareBox = (half: number): Box => ({ minX: -half, minY: -half, maxX: half, maxY: half });

/** Bounds of the layers at the given rotations (their static ones by default). */
export function layersBounds(
  layers: readonly SquareLayer[],
  rotations: readonly number[] = layers.map((l) => l.rotation),
): Box {
  return layers.reduce(
    (box, layer, i) =>
      unionBox(
        box,
        squareBox(rotatedHalfExtent(layer.size, layer.cornerRadius, rotations[i] ?? layer.rotation)),
      ),
    emptyBox(),
  );
}

// ---------------------------------------------------------------------------
// Central tile
// ---------------------------------------------------------------------------

interface RoundedCorner {
  /** Where the corner arc starts, on the edge arriving at the corner. */
  before: Point;
  /** Midpoint of the arc, on the corner's diagonal. */
  mid: Point;
  /** Where the arc ends, on the edge leaving the corner. */
  after: Point;
}

/** Corners of a rounded rectangle in clockwise order from the top-left. */
function roundedCorners(x: number, y: number, size: number, r: number): RoundedCorner[] {
  const x1 = x + size;
  const y1 = y + size;
  const k = r * (1 - Math.SQRT1_2);
  return [
    { before: { x, y: y + r }, mid: { x: x + k, y: y + k }, after: { x: x + r, y } },
    { before: { x: x1 - r, y }, mid: { x: x1 - k, y: y + k }, after: { x: x1, y: y + r } },
    { before: { x: x1, y: y1 - r }, mid: { x: x1 - k, y: y1 - k }, after: { x: x1 - r, y: y1 } },
    { before: { x: x + r, y: y1 }, mid: { x: x + k, y: y1 - k }, after: { x, y: y1 - r } },
  ];
}

const n = (v: number) => Number(v.toFixed(3)).toString();

/**
 * Four triangular facets meeting at a shared apex. Each runs from the
 * middle of one rounded corner, along a tile edge, to the middle of the
 * next corner, so together they tile the rounded square exactly.
 */
export function generateFacets(
  x: number,
  y: number,
  size: number,
  cornerRadius: number,
  shading: FacetShading,
): PathShape[] {
  const r = clampCornerRadius(size, cornerRadius);
  const corners = roundedCorners(x, y, size, r);
  const apex = { x: x + shading.apexX * size, y: y + shading.apexY * size };
  const names = ['top', 'right', 'bottom', 'left'] as const;
  const arc = (p: Point) => (r > 0 ? `A${n(r)} ${n(r)} 0 0 1 ${n(p.x)} ${n(p.y)}` : `L${n(p.x)} ${n(p.y)}`);

  return names.map((name, i) => {
    const a = corners[i] as RoundedCorner;
    const b = corners[(i + 1) % 4] as RoundedCorner;
    const shade = shading[name];
    return {
      id: `facet-${name}`,
      d:
        `M${n(a.mid.x)} ${n(a.mid.y)}${arc(a.after)}` +
        `L${n(b.before.x)} ${n(b.before.y)}${arc(b.mid)}` +
        `L${n(apex.x)} ${n(apex.y)}Z`,
      fill: shade >= 0 ? palette.white : palette.navy,
      opacity: Math.min(Math.abs(shade), 1),
    };
  });
}

/** Outlines of the tile lettering, flush to the bottom-right margins. */
export function generateLettering(config: TileConfig, font: Font, x: number, y: number): PathShape[] {
  const { size } = config;
  const fontSize = (config.textScale * size) / capHeightRatio(font);
  const baseline = y + size - config.textOffsetY * size;
  const options = { baseline, fontSize, letterSpacing: config.letterSpacing };
  const measured = layoutTextRun(font, config.text, { ...options, x: 0 });
  const right = x + size - config.textOffsetX * size;
  const placed = layoutTextRun(font, config.text, {
    ...options,
    x: right - glyphBounds(measured.glyphs).maxX,
  });
  return placed.glyphs.map((g, i) => ({
    id: `tile-letter-${i}-${g.char}`,
    d: g.d,
    fill: config.textColour,
  }));
}

export function generateTile(config: TileConfig, font: Font): TileModel {
  const x = -config.size / 2;
  const y = -config.size / 2;
  return {
    x,
    y,
    size: config.size,
    cornerRadius: clampCornerRadius(config.size, config.cornerRadius),
    fill: config.colour,
    facets: generateFacets(x, y, config.size, config.cornerRadius, config.facets),
    lettering: generateLettering(config, font, x, y),
  };
}

// ---------------------------------------------------------------------------
// Emblem
// ---------------------------------------------------------------------------

export function buildEmblem(emblem: EmblemConfig, tile: TileConfig, sans: Font): EmblemModel {
  const layers = generateLayers(emblem);
  const tileBox = squareBox(tile.size / 2);
  const safe = layers.reduce(
    (r, l) => Math.max(r, rotationSafeRadius(l.size, l.cornerRadius)),
    0,
  );
  return {
    layers,
    tile: generateTile(tile, sans),
    bounds: unionBox(layersBounds(layers), tileBox),
    rotationSafeBounds: unionBox(squareBox(safe), tileBox),
  };
}

// ---------------------------------------------------------------------------
// Wordmark
// ---------------------------------------------------------------------------

/**
 * Where the flourishes join their letters, measured from the glyph outlines
 * (lengths in cap heights). The L curl continues its top-left serif; the
 * t terminal continues the right end of its crossbar. Each curl starts
 * `overlap` inside the stroke's tip, at the stroke's own thickness.
 */
const flourishJoins = {
  /** Depth below the cap line at which the L's serif is probed. */
  serifProbe: 0.02,
  /** Distance right of the t's stem at which its crossbar is probed. */
  crossbarProbe: 0.03,
  overlap: 0.06,
  /** Used only if a glyph has no measurable stroke (e.g. other text). */
  fallbackWidth: 0.03,
} as const;

function serifJoin(glyph: PlacedGlyph, capHeight: number): StrokeJoin {
  const { serifProbe, overlap, fallbackWidth } = flourishJoins;
  const y = glyph.bounds.minY + serifProbe * capHeight;
  return (
    horizontalStrokeEnd(flattenCommands(glyph.commands), y, 'left', overlap * capHeight) ?? {
      origin: { x: glyph.bounds.minX + overlap * capHeight, y },
      thickness: fallbackWidth * capHeight,
      top: glyph.bounds.minY,
    }
  );
}

function crossbarJoin(glyph: PlacedGlyph, xHeight: number, capHeight: number): StrokeJoin {
  const { crossbarProbe, overlap, fallbackWidth } = flourishJoins;
  const midXHeight = glyph.baseline - xHeight / 2;
  return (
    crossbarRight(
      flattenCommands(glyph.commands),
      midXHeight,
      crossbarProbe * capHeight,
      overlap * capHeight,
    ) ?? {
      origin: { x: glyph.bounds.maxX - overlap * capHeight, y: glyph.baseline - xHeight },
      thickness: fallbackWidth * capHeight,
      top: glyph.baseline - xHeight,
    }
  );
}

/**
 * Lays out the two-line wordmark at `fontSize`. In wordmark space the top
 * of the capitals is y = 0 and the first line starts at x = 0.
 */
export function buildWordmark(config: WordmarkConfig, font: Font, fontSize: number): WordmarkModel {
  const capHeight = capHeightRatio(font) * fontSize;
  const baselines = [capHeight, capHeight + config.lineSpacing * fontSize] as const;
  const shapes: PathShape[] = [];
  const lineGlyphs: { glyph: PlacedGlyph; colour: string }[][] = [];

  config.lines.forEach((line, lineIndex) => {
    const placed: { glyph: PlacedGlyph; colour: string }[] = [];
    let x = line.indent * fontSize;
    let previous: ReturnType<Font['charToGlyph']> | undefined;
    for (const run of line.runs) {
      const layout = layoutTextRun(font, run.text, {
        x,
        baseline: baselines[lineIndex] as number,
        fontSize,
        letterSpacing: config.letterSpacing,
        previous,
      });
      for (const glyph of layout.glyphs) placed.push({ glyph, colour: run.colour });
      x = layout.endX;
      previous = font.stringToGlyphs(run.text).at(-1) ?? previous;
    }
    lineGlyphs.push(placed);
    placed.forEach(({ glyph, colour }, i) =>
      shapes.push({ id: `glyph-${lineIndex}-${i}-${glyph.char}`, d: glyph.d, fill: colour }),
    );
  });

  let bounds = lineGlyphs.flat().reduce((box, { glyph }) => unionBox(box, glyph.bounds), emptyBox());

  const first = lineGlyphs[0]?.[0];
  const last = lineGlyphs[1]?.at(-1);
  if (config.flourishScale > 0 && first && last) {
    const common = { capHeight, scale: config.flourishScale };
    const serif = serifJoin(first.glyph, capHeight);
    const lCurl = curlShapes('flourish-l', first.colour, {
      ...common,
      direction: -1,
      origin: serif.origin,
      rootWidth: serif.thickness,
    });
    const crossbar = crossbarJoin(last.glyph, xHeightRatio(font) * fontSize, capHeight);
    const tCurl = curlShapes('flourish-t', last.colour, {
      ...common,
      direction: 1,
      origin: crossbar.origin,
      rootWidth: crossbar.thickness,
    });
    shapes.push(...lCurl.shapes, ...tCurl.shapes);
    bounds = unionBox(bounds, unionBox(lCurl.bounds, tCurl.bounds));
  }

  return { shapes, bounds, capTop: 0, lastBaseline: baselines[1], fontSize };
}

/**
 * Font size at which the distance from the top of "London" to the baseline
 * of "TypeScript" equals `height`.
 */
export function wordmarkFontSizeForHeight(font: Font, lineSpacing: number, height: number): number {
  return height / (capHeightRatio(font) + lineSpacing);
}

// ---------------------------------------------------------------------------
// Horizontal logo
// ---------------------------------------------------------------------------

/**
 * The complete horizontal logo. The wordmark is sized so that its cap top
 * and last baseline align with the top and bottom edges of the tile, then
 * placed `horizontalGap` tile widths to the right of the rosette.
 */
export function buildLogo(config: LogoConfig, fonts: LogoFonts): LogoModel {
  const emblem = buildEmblem(config.emblem, config.tile, fonts.sans);
  const fontSize = wordmarkFontSizeForHeight(fonts.serif, config.wordmark.lineSpacing, config.tile.size);
  const wordmark = buildWordmark(config.wordmark, fonts.serif, fontSize);
  const wordmarkOffset = {
    x: emblem.bounds.maxX + config.layout.horizontalGap * config.tile.size - wordmark.bounds.minX,
    y: -config.tile.size / 2 - wordmark.capTop,
  };
  const placedWordmark = translateBox(wordmark.bounds, wordmarkOffset.x, wordmarkOffset.y);
  return {
    emblem,
    wordmark,
    wordmarkOffset,
    bounds: unionBox(emblem.bounds, placedWordmark),
    rotationSafeBounds: unionBox(emblem.rotationSafeBounds, placedWordmark),
    background: config.layout.background,
  };
}
