import { describe, expect, it } from 'vitest';
import { irregular } from './fixtures';
import { parseCandidates } from './validate';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

describe('parseCandidates', () => {
  it('accepts a list of fully written configurations', () => {
    const list = [{ label: 'a', config: clone(irregular) }];
    expect(parseCandidates(list)).toEqual(list);
  });

  it('refuses anything that isn’t a non-empty list', () => {
    expect(() => parseCandidates({})).toThrow(/expected a non-empty list/);
    expect(() => parseCandidates([])).toThrow(/expected a non-empty list/);
  });

  it('refuses a missing field instead of filling it in', () => {
    const config = clone(irregular) as unknown as { emblem: Record<string, unknown> };
    delete config.emblem.fade;
    expect(() => parseCandidates([{ label: 'a', config }])).toThrow(/candidate 1 \(a\): config\.emblem\.fade: missing/);
  });

  it('refuses a non-finite or mistyped number', () => {
    const config = clone(irregular) as unknown as { tile: { halo: Record<string, unknown> } };
    config.tile.halo.reach = 'far';
    expect(() => parseCandidates([{ label: 'a', config }])).toThrow(
      /config\.tile\.halo\.reach: expected a finite number/,
    );
    // JSON has no Infinity, but a caller of the library might pass one.
    const infinite = clone(irregular);
    infinite.emblem.opacity = Infinity;
    expect(() => parseCandidates([{ label: 'a', config: infinite }])).toThrow(
      /config\.emblem\.opacity: expected a finite number/,
    );
  });

  it('refuses a field the configuration doesn’t have', () => {
    const config = { ...clone(irregular), extra: 1 };
    expect(() => parseCandidates([{ label: 'a', config }])).toThrow(/config\.extra: not a field of the configuration/);
  });

  it('refuses a tile whose size isn’t positive', () => {
    const config = clone(irregular);
    config.tile.size = 0;
    expect(() => parseCandidates([{ label: 'a', config }])).toThrow(/config\.tile\.size: must be positive/);
  });

  it('refuses a bad blend mode, colour or label', () => {
    const blend = clone(irregular) as unknown as { emblem: Record<string, unknown> };
    blend.emblem.blendMode = 'screen';
    expect(() => parseCandidates([{ label: 'a', config: blend }])).toThrow(
      /config\.emblem\.blendMode: expected one of/,
    );
    const colour = clone(irregular) as unknown as { emblem: { colours: unknown[] } };
    colour.emblem.colours[1] = 'red';
    expect(() => parseCandidates([{ label: 'a', config: colour }])).toThrow(
      /config\.emblem\.colours\[1\]: expected a hex colour/,
    );
    expect(() => parseCandidates([{ label: '', config: clone(irregular) }])).toThrow(
      /candidate 1: label: expected a non-empty string/,
    );
  });

  it('refuses duplicate labels', () => {
    const c = clone(irregular);
    expect(() =>
      parseCandidates([
        { label: 'a', config: c },
        { label: 'a', config: c },
      ]),
    ).toThrow(/duplicate label "a"/);
  });
});
