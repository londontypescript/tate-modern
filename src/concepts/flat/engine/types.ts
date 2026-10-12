/**
 * Data model of the flat concept, shared by its geometry engine, animation
 * module and renderers. Everything here is plain data: no React, no DOM.
 *
 * Coordinates are SVG user units with the y axis pointing down. Angles are
 * in degrees, positive clockwise (the SVG `rotate()` convention).
 */
import type { Box, PathShape, Point, WordmarkModel } from '../../../shared';

/**
 * One translucent background sheet: a rounded rectangle, square unless the
 * variation stretches it, centred on (x, y) (the emblem origin unless the
 * variation shifts it).
 */
export interface SheetLayer {
  id: string;
  /** Paint order: 0 is drawn first (furthest back). */
  index: number;
  width: number;
  height: number;
  /** Centre of the sheet, which it turns about. */
  x: number;
  y: number;
  /** Static rotation about the sheet's own centre. */
  rotation: number;
  /** Already limited to half the smaller side. */
  cornerRadius: number;
  fill: string;
  opacity: number;
  blendMode: 'normal' | 'multiply';
  /** A fade across the sheet, in its own (moving, turning) frame; none when uniform. */
  fade?: LayerFade;
}

/** Linear fade across a sheet, from `fill` at full strength to `colour`. */
interface LayerFade {
  /** Direction towards the clear edge, in degrees, in the sheet's frame. */
  angle: number;
  /** Opacity lost by the clear edge (0..1). */
  strength: number;
  /** Colour at the clear edge. */
  colour: string;
}

/** The stationary central tile, axis-aligned and centred on the origin. */
export interface TileModel {
  x: number;
  y: number;
  size: number;
  cornerRadius: number;
  fill: string;
  /** Translucent triangular overlays that give the tile its folded facets. */
  facets: PathShape[];
  /** Outlined "TS" glyphs. */
  lettering: PathShape[];
}

export interface EmblemModel {
  layers: SheetLayer[];
  tile: TileModel;
  /** Tight bounds of the static composition. */
  bounds: Box;
  /** Bounds that contain every sheet at any rotation about its centre (for animation). */
  rotationSafeBounds: Box;
}

export interface LogoModel {
  emblem: EmblemModel;
  wordmark: WordmarkModel;
  /** Translation applied to the wordmark inside the horizontal logo. */
  wordmarkOffset: Point;
  bounds: Box;
  rotationSafeBounds: Box;
  background: string;
}
