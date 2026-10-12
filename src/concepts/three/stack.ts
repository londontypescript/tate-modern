import type { MaterialConfig, SlabConfig, StackConfig } from './config';

const DEG = Math.PI / 180;

/** Where one slab sits in the stack (scene units, radians). */
export interface SlabPlacement {
  index: number;
  position: readonly [number, number, number];
  /** Rotation about the viewing axis. */
  rotation: number;
  scale: readonly [number, number, number];
  opacity: number;
}

/**
 * The prototype's "scrambled" angle for slab `index`: it set
 * `rotation.z = 19000 × 2 × (index + 1) × 0.01`, which looks random but is
 * fixed. Reduced to [0, 2π) so it stays readable.
 */
export const scrambledAngle = (index: number) => (((380 * (index + 1)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

/**
 * Places every slab, front (index 0) to back. Each slab behind the front
 * one is turned by `rotateStep`, grown by `scaleStep`, pushed back by
 * `depthStep` and drifted by `offsetX/Y`.
 */
export function placeSlabs(stack: StackConfig, slab: SlabConfig, material: MaterialConfig): SlabPlacement[] {
  const count = Math.max(0, Math.floor(stack.count));
  return Array.from({ length: count }, (_, index) => {
    const s = stack.scaleStart + index * stack.scaleStep;
    return {
      index,
      position: [index * stack.offsetX, index * stack.offsetY, -index * stack.depthStep] as const,
      rotation: stack.scramble ? scrambledAngle(index) : index * stack.rotateStep * DEG,
      scale: [s, s, slab.depthFollowsScale ? 1 + s : 1] as const,
      opacity: Math.min(1, Math.max(0, material.opacity - index * material.opacityFalloff)),
    };
  });
}

/** Half-width of a slab's outline in its own units: core square plus chamfer. */
export const slabHalfWidth = (slab: SlabConfig) => 0.5 + slab.bevelOffset + slab.bevelSize;

/** Half-width of the slab's flat front face, inside the chamfer. */
export const slabFaceHalfWidth = (slab: SlabConfig) => 0.5 + slab.bevelOffset;

/** Distance from a slab's centre to its front face, before scaling. */
export const slabFrontZ = (slab: SlabConfig) => slab.depth / 2 + slab.bevelThickness;
