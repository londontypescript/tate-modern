/**
 * The 3D concept: the original React Three Fiber sculpture of bevelled,
 * translucent metal slabs, expressed as parameters. Lengths are in scene
 * units (a slab's core square is 1 unit wide); angles are in degrees.
 *
 * The defaults reproduce the visible stack in the March 2026 prototype
 * (`londontypescript/site`, `LTSLogo.tsx` and `App.tsx`).
 */
import { palette } from '../../shared';

/** How the slabs are arranged, slab 0 at the front. */
export interface StackConfig {
  count: number;
  /** Rotation about the viewing axis added per slab. */
  rotateStep: number;
  /**
   * Replace the even fan with the prototype's scrambled angles
   * (380 × (n + 1) radians), which look random but are fixed.
   */
  scramble: boolean;
  /** Scale of the front slab and the scale added per slab behind it. */
  scaleStart: number;
  scaleStep: number;
  /** Distance between slabs along the viewing axis. */
  depthStep: number;
  /** Sideways and vertical drift per slab, for a fanned deck. */
  offsetX: number;
  offsetY: number;
  /** Tilt of the whole stack. */
  tiltX: number;
  tiltY: number;
  /** Overall scale of the stack. */
  scale: number;
}

/** One slab: a square extruded with a wide chamfer (three's ExtrudeGeometry). */
export interface SlabConfig {
  depth: number;
  bevelThickness: number;
  bevelSize: number;
  bevelOffset: number;
  bevelSegments: number;
  /** Stretch along the viewing axis grows with the slab's scale (as in the prototype). */
  depthFollowsScale: boolean;
}

export interface MaterialConfig {
  colour: string;
  metalness: number;
  roughness: number;
  opacity: number;
  /** Opacity lost per slab towards the back (0 = all equal). */
  opacityFalloff: number;
}

export type EnvironmentPreset =
  'none' | 'apartment' | 'city' | 'dawn' | 'forest' | 'lobby' | 'night' | 'park' | 'studio' | 'sunset' | 'warehouse';

export const environmentPresets: readonly EnvironmentPreset[] = [
  'none',
  'warehouse',
  'studio',
  'city',
  'apartment',
  'lobby',
  'dawn',
  'sunset',
  'night',
  'forest',
  'park',
];

export interface LightingConfig {
  ambient: number;
  /** The two strong lights from the right, above and below the stack. */
  key: number;
  /** Weak light from behind on the left, so nothing goes fully black. */
  fill: number;
  /** Swings the key lights around the stack (0 = from the right, as in the prototype). */
  keyAzimuth: number;
  /** Image-based lighting: what the metal reflects. */
  environment: EnvironmentPreset;
  environmentIntensity: number;
}

export interface CameraConfig {
  fov: number;
  distance: number;
}

export interface LetteringConfig {
  /** Put the tile's "TS" on the front slab. */
  show: boolean;
  colour: string;
}

export interface MotionConfig {
  /** Turn rate of the front slab in degrees per second; slab n turns n + 1 times as fast. */
  speed: number;
}

export interface SceneLayoutConfig {
  background: string;
  /** Show the shared wordmark beside the render. */
  wordmark: boolean;
}

export interface ThreeConfig {
  stack: StackConfig;
  slab: SlabConfig;
  material: MaterialConfig;
  lighting: LightingConfig;
  camera: CameraConfig;
  lettering: LetteringConfig;
  motion: MotionConfig;
  layout: SceneLayoutConfig;
}

const RAD = 180 / Math.PI;

export const defaultThreeConfig: ThreeConfig = {
  stack: {
    count: 30,
    rotateStep: 0.15 * RAD,
    scramble: false,
    scaleStart: 0.3,
    scaleStep: 0.1,
    depthStep: 0.2,
    offsetX: 0,
    offsetY: 0,
    tiltX: 0,
    tiltY: 0,
    scale: 1,
  },
  slab: {
    depth: 0.1,
    bevelThickness: 0.05,
    bevelSize: 0.2,
    bevelOffset: 0.2,
    bevelSegments: 3,
    depthFollowsScale: true,
  },
  material: {
    colour: '#006eff',
    metalness: 1,
    roughness: 0.375,
    opacity: 0.75,
    opacityFalloff: 0,
  },
  lighting: {
    ambient: 2,
    key: 30,
    fill: 2,
    keyAzimuth: 0,
    environment: 'none',
    environmentIntensity: 1,
  },
  camera: { fov: 50, distance: 5 },
  lettering: { show: false, colour: palette.white },
  motion: { speed: 0 },
  layout: { background: '#ffffff', wordmark: false },
};
