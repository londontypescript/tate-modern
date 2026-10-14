import type { Font } from 'opentype.js';
import {
  capHeightRatio,
  glyphBounds,
  layoutTextRun,
  palette,
  placeWordmark,
  unionBox,
  type LogoFonts,
  type PathShape,
  type Point,
} from '../../../shared';
import type { EmblemConfig, FacetShading, LogoConfig, TileConfig } from './config';
import { clampCornerRadius, layersBounds, rotationSafeLayersBounds } from './bounds';
import { buildHalo } from './halo';
import { Channel, sample, type ChannelKey } from './random';
import { sanitizeEmblemConfig, sanitizeLogoConfig } from './sanitize';
import type { EmblemModel, LogoModel, SheetLayer, TileModel } from './types';

// ---------------------------------------------------------------------------
// Background sheets
// ---------------------------------------------------------------------------

/**
 * The background sheets, back to front. Each is rotated
 * `initialRotation + index * rotationIncrement` and scaled linearly by
 * `sizeTaper` from the back layer to the front one. The variation then
 * adds, per sheet, a seeded turn, a change of size, a stretch away from a
 * square that keeps the mean side, and a shift of its centre. With every
 * jitter at 0 each sheet is exactly the centred square it always was.
 */
export function generateLayers(input: EmblemConfig): SheetLayer[] {
  const config = sanitizeEmblemConfig(input);
  // Already a whole number: rounding happens once, in the sanitising.
  const count = config.layerCount;
  const colours = config.colours.length > 0 ? config.colours : [palette.blue];
  return Array.from({ length: count }, (_, index) => {
    const u = (channel: ChannelKey) => sample(config.seed, index, channel);
    const depth = count > 1 ? index / (count - 1) : 0;
    const tapered = config.squareSize * (1 - config.sizeTaper * depth);
    const size = Math.max(tapered * (1 + config.sizeJitter * u(Channel.size)), 0);
    const stretch = config.aspectJitter * u(Channel.aspect);
    const width = size * (1 + stretch);
    const height = size * (1 - stretch);
    return {
      id: `layer-${index}`,
      index,
      width,
      height,
      // `|| 0` turns -0 into 0, so a neutral sheet is exactly at the origin.
      x: config.offsetJitter * u(Channel.offsetX) || 0,
      y: config.offsetJitter * u(Channel.offsetY) || 0,
      rotation: config.initialRotation + index * config.rotationIncrement + config.rotationJitter * u(Channel.rotation),
      cornerRadius: clampCornerRadius(Math.min(width, height), config.cornerRadius),
      fill: colours[index % colours.length] as string,
      opacity: config.opacity,
      blendMode: config.blendMode,
      fade:
        config.fade > 0
          ? {
              angle: (((config.fadeAngle + index * config.fadeTurn) % 360) + 360) % 360,
              strength: Math.min(config.fade, 1),
              colour: config.fadeColour,
            }
          : undefined,
    };
  });
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
function generateLettering(config: TileConfig, font: Font, x: number, y: number): PathShape[] {
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

function generateTile(config: TileConfig, font: Font): TileModel {
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

function buildEmblem(emblem: EmblemConfig, tile: TileConfig, sans: Font): EmblemModel {
  const layers = generateLayers(emblem);
  const half = tile.size / 2;
  const tileBox = { minX: -half, minY: -half, maxX: half, maxY: half };
  const halo = buildHalo(tile);
  // The tile and its halo stay still, so both framings hold them as they are.
  const still = halo ? unionBox(tileBox, halo.box) : tileBox;
  return {
    layers,
    tile: generateTile(tile, sans),
    ...(halo && { halo }),
    bounds: unionBox(layersBounds(layers), still),
    rotationSafeBounds: unionBox(rotationSafeLayersBounds(layers), still),
  };
}

// ---------------------------------------------------------------------------
// Horizontal logo
// ---------------------------------------------------------------------------

/**
 * The complete horizontal logo. The wordmark is sized so that its cap top
 * and last baseline align with the top and bottom edges of the tile, then
 * placed `horizontalGap` tile widths to the right of the rosette. The
 * configuration may be a hand-edited saved one, so every number is checked
 * first (`sanitizeLogoConfig`).
 */
export function buildLogo(input: LogoConfig, fonts: LogoFonts): LogoModel {
  const config = sanitizeLogoConfig(input);
  const emblem = buildEmblem(config.emblem, config.tile, fonts.sans);
  const placed = placeWordmark(config.wordmark, fonts.serif, {
    emblemBounds: emblem.bounds,
    alignTop: -config.tile.size / 2,
    alignHeight: config.tile.size,
    gap: config.layout.horizontalGap * config.tile.size,
  });
  return {
    emblem,
    wordmark: placed.wordmark,
    wordmarkOffset: placed.offset,
    bounds: unionBox(emblem.bounds, placed.bounds),
    rotationSafeBounds: unionBox(emblem.rotationSafeBounds, placed.bounds),
    background: config.layout.background,
  };
}
