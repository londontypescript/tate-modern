import { emptyBox, unionBox, type Box } from '../../../shared';
import type { SheetLayer } from './types';

const DEG = Math.PI / 180;

/** Corner radius limited to what a side of the given length can hold. */
export const clampCornerRadius = (side: number, radius: number) => Math.min(Math.max(radius, 0), side / 2);

/**
 * The straight half-lengths of a rounded rectangle: the rectangle left once
 * the corner radius is taken off every side. Its corners carry the arcs.
 */
function straightHalves(width: number, height: number, cornerRadius: number) {
  const r = clampCornerRadius(Math.min(width, height), cornerRadius);
  return { a: width / 2 - r, b: height / 2 - r, r };
}

/**
 * Half-width and half-height of the axis-aligned box around a rounded
 * rectangle turned `rotation` degrees about its centre: the straight part
 * contributes a|cos θ| + b|sin θ| across and a|sin θ| + b|cos θ| down, and
 * the corner arcs add r. A square is computed exactly as it always was, so
 * existing emblems keep their byte-identical viewBox.
 */
export function sheetHalfExtents(width: number, height: number, cornerRadius: number, rotation: number) {
  const { a, b, r } = straightHalves(width, height, cornerRadius);
  const theta = rotation * DEG;
  const cos = Math.abs(Math.cos(theta));
  const sin = Math.abs(Math.sin(theta));
  if (a === b) {
    const half = a * (cos + sin) + r;
    return { hx: half, hy: half };
  }
  return { hx: a * cos + b * sin + r, hy: a * sin + b * cos + r };
}

/** Distance from a sheet's centre to its furthest point, which bounds it at every angle. */
export function sheetSafeRadius(width: number, height: number, cornerRadius: number): number {
  const { a, b, r } = straightHalves(width, height, cornerRadius);
  return (a === b ? a * Math.SQRT2 : Math.hypot(a, b)) + r;
}

const boxAround = (x: number, y: number, hx: number, hy: number): Box => ({
  minX: x - hx,
  minY: y - hy,
  maxX: x + hx,
  maxY: y + hy,
});

/** Bounds of one sheet at the given rotation about its own centre. */
export function sheetBox(sheet: SheetLayer, rotation: number = sheet.rotation): Box {
  const { hx, hy } = sheetHalfExtents(sheet.width, sheet.height, sheet.cornerRadius, rotation);
  return boxAround(sheet.x, sheet.y, hx, hy);
}

/** Bounds of the sheets at the given rotations (their static ones by default). */
export function layersBounds(
  layers: readonly SheetLayer[],
  rotations: readonly number[] = layers.map((l) => l.rotation),
): Box {
  return layers.reduce((box, layer, i) => unionBox(box, sheetBox(layer, rotations[i] ?? layer.rotation)), emptyBox());
}

/** Bounds of the sheets at every rotation: each turns in place, so its reach is a circle about its centre. */
export function rotationSafeLayersBounds(layers: readonly SheetLayer[]): Box {
  return layers.reduce((box, layer) => {
    const radius = sheetSafeRadius(layer.width, layer.height, layer.cornerRadius);
    return unionBox(box, boxAround(layer.x, layer.y, radius, radius));
  }, emptyBox());
}
