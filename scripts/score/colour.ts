/**
 * Colour difference for the score: 8-bit sRGB, gamma-decoded, to CIE XYZ
 * and CIELAB under the D65 white, then CIEDE2000 between two CIELAB
 * colours. Plain maths, no dependencies.
 */

export interface Lab {
  L: number;
  a: number;
  b: number;
}

/** The sRGB transfer function undone, for each 8-bit level (IEC 61966-2-1). */
const linear = Float64Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

// Linear sRGB to XYZ (D65), the matrix from IEC 61966-2-1.
const M = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
] as const;

// The D65 white as the matrix maps sRGB white, so (255, 255, 255) is exactly neutral.
const white = M.map((row) => row[0] + row[1] + row[2]) as [number, number, number];

const EPSILON = 216 / 24389;
const KAPPA = 24389 / 27;
const f = (t: number) => (t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116);

/** CIELAB (D65) of an 8-bit sRGB colour. */
export function srgbToLab(r: number, g: number, b: number): Lab {
  const [lr, lg, lb] = [linear[r] ?? 0, linear[g] ?? 0, linear[b] ?? 0];
  const xyz = M.map((row) => row[0] * lr + row[1] * lg + row[2] * lb);
  const [fx, fy, fz] = xyz.map((v, i) => f(v / white[i as 0 | 1 | 2])) as [number, number, number];
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const DEG = Math.PI / 180;
const POW25_7 = 25 ** 7;

/** Hue angle in degrees, 0..360, and 0 for a neutral colour. */
function hue(b: number, a: number) {
  if (a === 0 && b === 0) return 0;
  const h = Math.atan2(b, a) / DEG;
  return h < 0 ? h + 360 : h;
}

/**
 * CIEDE2000 colour difference (kL = kC = kH = 1), following Sharma, Wu and
 * Dalal's implementation notes, including their handling of hue when one
 * colour is neutral.
 */
export function ciede2000(p: Lab, q: Lab): number {
  const C1 = Math.hypot(p.a, p.b);
  const C2 = Math.hypot(q.a, q.b);
  const Cbar7 = ((C1 + C2) / 2) ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + POW25_7)));
  const a1 = (1 + G) * p.a;
  const a2 = (1 + G) * q.a;
  const C1p = Math.hypot(a1, p.b);
  const C2p = Math.hypot(a2, q.b);
  const h1 = hue(p.b, a1);
  const h2 = hue(q.b, a2);

  const dL = q.L - p.L;
  const dC = C2p - C1p;
  let dh = 0;
  if (C1p * C2p !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * DEG);

  const Lbar = (p.L + q.L) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbar = h1 + h2;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1 - h2) <= 180) hbar /= 2;
    else hbar = h1 + h2 < 360 ? (hbar + 360) / 2 : (hbar - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos((hbar - 30) * DEG) +
    0.24 * Math.cos(2 * hbar * DEG) +
    0.32 * Math.cos((3 * hbar + 6) * DEG) -
    0.2 * Math.cos((4 * hbar - 63) * DEG);
  const dTheta = 30 * Math.exp(-(((hbar - 275) / 25) ** 2));
  const Cbarp7 = Cbarp ** 7;
  const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + POW25_7));
  const L50 = (Lbar - 50) ** 2;
  const SL = 1 + (0.015 * L50) / Math.sqrt(20 + L50);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin(2 * dTheta * DEG) * RC;

  const l = dL / SL;
  const c = dC / SC;
  const h = dH / SH;
  return Math.sqrt(l * l + c * c + h * h + RT * c * h);
}
