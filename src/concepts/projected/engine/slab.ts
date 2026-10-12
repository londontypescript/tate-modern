import type { SlabConfig } from '../../three/config';
import type { Vec3 } from './vec';

/** A planar face of a slab, in the slab's own units (centred, y up, +z towards the viewer). */
export interface SlabFace {
  /** `front` is the flat face that can carry lettering. */
  kind: 'front' | 'bevel' | 'side' | 'back';
  points: readonly Vec3[];
}

/** Square of half-width `r` at depth `z`, counter-clockwise seen from +z. */
const ring = (r: number, z: number): Vec3[] => [
  [-r, -r, z],
  [r, -r, z],
  [r, r, z],
  [-r, r, z],
];

/**
 * The faces of one slab, matching three.js's `ExtrudeGeometry` for a unit
 * square with a bevel: the cap is the square grown by `bevelOffset`, and the
 * chamfer follows a quarter-circle profile in `bevelSegments` steps, out to
 * `bevelOffset + bevelSize` where the straight sides begin. Centred on the
 * origin (as after `geometry.center()`), so the front cap sits at
 * z = depth / 2 + bevelThickness. Winding is not guaranteed; renderers
 * orient normals outwards from the slab's centre.
 */
export function slabFaces(slab: SlabConfig): SlabFace[] {
  const segments = Math.max(1, Math.round(slab.bevelSegments));
  const half = slab.depth / 2;
  const rings = Array.from({ length: segments + 1 }, (_, b) => {
    const t = (b / segments) * (Math.PI / 2);
    return {
      r: 0.5 + slab.bevelOffset + slab.bevelSize * Math.sin(t),
      z: half + slab.bevelThickness * Math.cos(t),
    };
  });

  const faces: SlabFace[] = [];
  const band = (a: Vec3[], b: Vec3[], kind: SlabFace['kind']) => {
    for (let k = 0; k < 4; k++) {
      const k1 = (k + 1) % 4;
      faces.push({ kind, points: [a[k] as Vec3, a[k1] as Vec3, b[k1] as Vec3, b[k] as Vec3] });
    }
  };

  for (const side of [1, -1] as const) {
    const at = (i: number) => ring((rings[i] as { r: number }).r, side * (rings[i] as { z: number }).z);
    faces.push({ kind: side === 1 ? 'front' : 'back', points: at(0) });
    for (let b = 0; b < segments; b++) band(at(b), at(b + 1), 'bevel');
  }
  const outer = (rings[segments] as { r: number }).r;
  band(ring(outer, half), ring(outer, -half), 'side');
  return faces;
}
