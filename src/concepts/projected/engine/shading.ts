/**
 * The parts of three.js's renderer that decide a face's colour, ported to
 * plain TypeScript so the projected SVG matches the 3D concept:
 *
 * - `MeshStandardMaterial`'s direct lighting: Lambert diffuse plus the GGX
 *   specular lobe (Smith-correlated visibility, Schlick Fresnel).
 * - ACES filmic tone mapping (react-three-fiber's default) and conversion
 *   between sRGB and linear light.
 *
 * Colours are linear RGB triples unless named sRGB. Formulas follow three's
 * shader chunks (`bsdfs`, `lights_physical_pars_fragment`, `tonemapping_pars_fragment`).
 */
import { dot, normalize, add, type Vec3 } from './vec';

const RECIPROCAL_PI = 1 / Math.PI;
const EPSILON = 1e-6;

export type Rgb = Vec3;

export const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const linearToSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToLinear(hex: string): Rgb {
  const n = Number.parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return [srgbToLinear(((n >> 16) & 255) / 255), srgbToLinear(((n >> 8) & 255) / 255), srgbToLinear((n & 255) / 255)];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function linearToHex(c: Rgb): string {
  const byte = (v: number) => Math.round(clamp01(linearToSrgb(clamp01(v))) * 255);
  return `#${c.map((v) => byte(v).toString(16).padStart(2, '0')).join('')}`;
}

/** Same, for a colour that is already sRGB-encoded (as after tone mapping). */
export function srgbToHex(c: Rgb): string {
  return `#${c.map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** Column-major 3×3 matrix times vector, as in GLSL `mat3(...) * v`. */
const mat3 = (m: readonly number[], v: Rgb): Rgb => [
  (m[0] as number) * v[0] + (m[3] as number) * v[1] + (m[6] as number) * v[2],
  (m[1] as number) * v[0] + (m[4] as number) * v[1] + (m[7] as number) * v[2],
  (m[2] as number) * v[0] + (m[5] as number) * v[1] + (m[8] as number) * v[2],
];

const ACES_INPUT = [0.59719, 0.076, 0.0284, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777];
const ACES_OUTPUT = [1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602];
const rrtAndOdtFit = (v: number) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);

/** three.js's `ACESFilmicToneMapping` (linear in, linear out, clamped). */
export function acesFilmic(colour: Rgb, exposure = 1): Rgb {
  const exposed = colour.map((v) => (v * exposure) / 0.6) as unknown as Rgb;
  const fitted = mat3(ACES_INPUT, exposed).map(rrtAndOdtFit) as unknown as Rgb;
  return mat3(ACES_OUTPUT, fitted).map(clamp01) as unknown as Rgb;
}

/** A directional light: unit vector towards the light, and its intensity. */
export interface DirectionalLight {
  direction: Vec3;
  intensity: number;
}

export interface Surface {
  /** Base colour, linear. */
  colour: Rgb;
  metalness: number;
  roughness: number;
}

function brdfGgx(l: Vec3, v: Vec3, n: Vec3, f0: Rgb, roughness: number): Rgb {
  const alpha = roughness * roughness;
  const h = normalize(add(l, v));
  const dotNL = clamp01(dot(n, l));
  const dotNV = clamp01(dot(n, v));
  const dotNH = clamp01(dot(n, h));
  const dotVH = clamp01(dot(v, h));
  const fresnel = (1 - dotVH) ** 5;
  const f: Rgb = [f0[0] + (1 - f0[0]) * fresnel, f0[1] + (1 - f0[1]) * fresnel, f0[2] + (1 - f0[2]) * fresnel];
  const a2 = alpha * alpha;
  const gv = dotNL * Math.sqrt(a2 + (1 - a2) * dotNV * dotNV);
  const gl = dotNV * Math.sqrt(a2 + (1 - a2) * dotNL * dotNL);
  const visibility = 0.5 / Math.max(gv + gl, EPSILON);
  const denom = dotNH * dotNH * (a2 - 1) + 1;
  const distribution = (RECIPROCAL_PI * a2) / (denom * denom);
  return [f[0] * visibility * distribution, f[1] * visibility * distribution, f[2] * visibility * distribution];
}

/**
 * Outgoing light from a point with normal `n` seen along `v` (unit vector
 * towards the camera), lit by `lights` and a uniform ambient light. Mirrors
 * `MeshStandardMaterial` without an environment map. Linear, before tone mapping.
 */
export function shade(surface: Surface, n: Vec3, v: Vec3, lights: readonly DirectionalLight[], ambient: number): Rgb {
  // three clamps roughness to at least 0.0525 to avoid a singular lobe.
  const roughness = Math.min(1, Math.max(surface.roughness, 0.0525));
  const diffuse = surface.colour.map((c) => c * (1 - surface.metalness)) as unknown as Rgb;
  const f0 = surface.colour.map((c) => 0.04 + (c - 0.04) * surface.metalness) as unknown as Rgb;
  let out: Rgb = diffuse.map((c) => c * ambient * RECIPROCAL_PI) as unknown as Rgb;
  for (const light of lights) {
    const dotNL = clamp01(dot(n, light.direction));
    if (dotNL <= 0 || light.intensity <= 0) continue;
    const irradiance = dotNL * light.intensity;
    const specular = brdfGgx(light.direction, v, n, f0, roughness);
    out = [
      out[0] + irradiance * (diffuse[0] * RECIPROCAL_PI + specular[0]),
      out[1] + irradiance * (diffuse[1] * RECIPROCAL_PI + specular[1]),
      out[2] + irradiance * (diffuse[2] * RECIPROCAL_PI + specular[2]),
    ];
  }
  return out;
}

/** The final on-screen sRGB colour, as react-three-fiber would output it. */
export const toDisplay = (linear: Rgb, exposure = 1): Rgb =>
  acesFilmic(linear, exposure).map(linearToSrgb) as unknown as Rgb;

/** Relative luminance of an sRGB-encoded colour (for choosing gradient ends). */
export const luminance = (c: Rgb) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
