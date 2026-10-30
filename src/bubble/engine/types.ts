/**
 * The bubble's drawing data: plain values, no React and no DOM, so the same
 * drawing renders live, as an export and in tests.
 *
 * Coordinates are in the bubble's own 240-unit box (see `bounds.ts`), y down.
 * Every paint is a concrete colour or a reference to one of the drawing's own
 * definitions by its local id; renderers prefix those ids.
 */

export type Theme = 'light' | 'dark';

export const themes: readonly Theme[] = ['light', 'dark'];

/** A `#rrggbb` colour, `none`, or one of the drawing's gradients by local id. */
export type Paint = string | { gradient: string };

export interface Stop {
  offset: number;
  colour: string;
  /** 1 when omitted. */
  opacity?: number;
}

/** Gradients use the shape's own bounding box (SVG's default units). */
export type Gradient =
  | { kind: 'linear'; id: string; x1: number; y1: number; x2: number; y2: number; stops: Stop[] }
  | { kind: 'radial'; id: string; cx: number; cy: number; r: number; stops: Stop[] };

/** A Gaussian blur; its region is in fractions of the shape's bounding box. */
export interface Blur {
  id: string;
  stdDeviation: number;
  region: { x: number; y: number; width: number; height: number };
}

export interface CircleClip {
  id: string;
  cx: number;
  cy: number;
  r: number;
}

/** Turns about a point, or scales about one: the two transforms the bubble uses. */
export type Transform = { rotate: number; cx: number; cy: number } | { scale: number; cx: number; cy: number };

export interface Paints {
  fill?: Paint;
  fillOpacity?: number;
  stroke?: Paint;
  strokeOpacity?: number;
  strokeWidth?: number;
  /** A blur's local id. */
  filter?: string;
  transform?: Transform;
}

export type Shape =
  | ({ kind: 'circle'; cx: number; cy: number; r: number } & Paints)
  | ({ kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number } & Paints)
  | ({ kind: 'rect'; x: number; y: number; width: number; height: number; rx: number } & Paints)
  | ({ kind: 'path'; d: string } & Paints);

/** Shapes painted together, optionally clipped, transformed or sharing paints. */
export interface Group extends Paints {
  kind: 'group';
  /** What the group draws, for tests and for reading the data; never written out. */
  name: string;
  clip?: string;
  children: Node[];
}

export type Node = Shape | Group;

interface Definitions {
  gradients: Gradient[];
  blurs: Blur[];
  clips: CircleClip[];
}

export interface BubbleDrawing {
  theme: Theme;
  /** Accessible name, written as the SVG `<title>`. */
  title: string;
  defs: Definitions;
  /** In paint order. */
  layers: Group[];
}
