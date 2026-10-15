import { describe, expect, it } from 'vitest';
import { defaultLogoConfig, type LogoConfig } from './engine';
import { defaults12October, irregular14October } from './frozenLooks';
import { flatStarters } from './starters';

const starter = (name: string) => flatStarters.find((s) => s.name === name)?.config;

/** Every object and array inside a configuration, so shared references can be found. */
const containers = (value: unknown): object[] =>
  typeof value === 'object' && value !== null ? [value, ...Object.values(value).flatMap(containers)] : [];

describe('the frozen looks are faithful copies', () => {
  /*
   * These compare each literal with the object it replaced, while that
   * object still exists. They hold only until the defaults change; from
   * then on the literals and their fixtures are the record.
   */
  it('copies the 12 October defaults, every field included', () => {
    expect(defaults12October).toEqual(defaultLogoConfig);
  });

  it('copies Irregular (14 Oct) as the starter spread it from the defaults', () => {
    const spread: LogoConfig = {
      ...defaultLogoConfig,
      emblem: {
        ...defaultLogoConfig.emblem,
        squareSize: 175,
        opacity: 0.5,
        fade: 0.55,
        fadeTurn: 0,
        fadeAngle: 315,
        rotationJitter: 12,
        sizeJitter: 0.15,
        aspectJitter: 0.12,
        offsetJitter: 8,
        seed: 7,
      },
      tile: { ...defaultLogoConfig.tile, halo: { strength: 0.4, reach: 14, offset: 5 } },
    };
    expect(irregular14October).toEqual(spread);
  });
});

describe('the frozen looks', () => {
  it('share no object with the engine defaults, so changing those leaves them as they are', () => {
    const live = new Set(containers(defaultLogoConfig));
    for (const look of [defaults12October, irregular14October]) {
      expect(containers(look).filter((c) => live.has(c))).toEqual([]);
    }
  });

  it('are what the historical starters show', () => {
    expect(starter('Original defaults')).toBe(defaults12October);
    expect(starter('Irregular (14 Oct)')).toBe(irregular14October);
    expect(starter('Irregular, 150 (14 Oct)')).toEqual({
      ...irregular14October,
      emblem: { ...irregular14October.emblem, squareSize: 150 },
    });
  });
});
