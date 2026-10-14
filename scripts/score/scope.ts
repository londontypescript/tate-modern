/**
 * P2's scope: a colour candidate may differ from the frozen geometry only in
 * the five colour fields. Checked field by field, so a candidate that moves
 * anything else (a sheet, the tile, the halo, the seed) is ineligible. This
 * replaces a shape guardrail while the geometry is frozen: visible damage
 * from colour alone is judged by the maintainer, not by the score.
 */

export const colourFields = [
  'emblem.colours',
  'emblem.fadeColour',
  'emblem.opacity',
  'emblem.blendMode',
  'tile.colour',
] as const;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** The paths at which `config` differs from `base` outside the colour fields, in order. */
export function outOfScope(config: object, base: object): string[] {
  const out: string[] = [];
  const walk = (a: unknown, b: unknown, path: string) => {
    if ((colourFields as readonly string[]).includes(path)) return;
    if (isObject(a) && isObject(b) && Array.isArray(a) === Array.isArray(b)) {
      const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
      for (const key of keys) walk(a[key], b[key], path ? `${path}.${key}` : key);
    } else if (!Object.is(a, b)) {
      out.push(path);
    }
  };
  walk(config, base, '');
  return out;
}
