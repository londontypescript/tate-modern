import { describe, expect, it } from 'vitest';
import { frozen } from './fixtures';
import { colourFields, outOfScope } from './scope';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Every leaf path of a configuration, arrays included element by element. */
function leaves(value: unknown, path = ''): string[] {
  if (typeof value !== 'object' || value === null) return [path];
  return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
}

/** A copy of `frozen` with the leaf at `path` changed. */
function changed(path: string) {
  const config = clone(frozen) as unknown as Record<string, unknown>;
  const keys = path.split('.');
  const last = keys.pop() as string;
  const parent = keys.reduce<Record<string, unknown>>((o, k) => o[k] as Record<string, unknown>, config);
  const v = parent[last];
  parent[last] = typeof v === 'number' ? v + 1 : typeof v === 'boolean' ? !v : `${String(v)}x`;
  return config as unknown as typeof frozen;
}

const isColourField = (path: string) => colourFields.some((f) => path === f || path.startsWith(`${f}.`));

describe('outOfScope', () => {
  it('names exactly the five colour fields P2 may change', () => {
    expect(colourFields).toEqual([
      'emblem.colours',
      'emblem.fadeColour',
      'emblem.opacity',
      'emblem.blendMode',
      'tile.colour',
    ]);
  });

  it('lets the frozen geometry and any change to its colour fields through', () => {
    expect(outOfScope(frozen, frozen)).toEqual([]);
    const coloured = clone(frozen);
    coloured.emblem.colours = ['#000000', '#111111', '#222222'];
    coloured.emblem.fadeColour = '#ffffff';
    coloured.emblem.opacity = 0.1;
    coloured.emblem.blendMode = 'normal';
    coloured.tile.colour = '#123456';
    expect(outOfScope(coloured, frozen)).toEqual([]);
  });

  it('refuses a change to every other field, one at a time', () => {
    const others = leaves(frozen).filter((path) => !isColourField(path));
    expect(others.length).toBeGreaterThan(40);
    const letThrough = others.filter((path) => !outOfScope(changed(path), frozen).includes(path));
    expect(letThrough, 'fields outside the colour scope must make a candidate ineligible').toEqual([]);
  });

  it('refuses a missing or added field', () => {
    const fewer = clone(frozen) as unknown as { tile: { halo: Record<string, unknown> } };
    delete fewer.tile.halo.reach;
    expect(outOfScope(fewer as unknown as typeof frozen, frozen)).toEqual(['tile.halo.reach']);
    const more = { ...clone(frozen), extra: 1 };
    expect(outOfScope(more, frozen)).toEqual(['extra']);
  });
});
