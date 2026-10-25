import { describe, expect, it } from 'vitest';
import { defaultWordmarkConfig } from '../../../shared';
import { defaultLogoConfig } from './config';

/** Every object and array inside a configuration, so shared references can be found. */
const containers = (value: unknown): object[] =>
  typeof value === 'object' && value !== null ? [value, ...Object.values(value).flatMap(containers)] : [];

describe('the flat defaults', () => {
  /*
   * The SVG fixtures pin everything the defaults draw, but not the
   * animation or the background, which no export writes unless asked:
   * these are the values approved with the look on 25 October 2026.
   */
  it('turn the sheets as approved', () => {
    expect(defaultLogoConfig.animation).toEqual({
      speed: 1,
      baseVelocity: 4,
      variation: 0.6,
      alternateDirection: false,
    });
  });

  it('sit on the approved cream', () => {
    expect(defaultLogoConfig.layout.background).toBe('#fcf6e9');
  });

  it('share no object with the shared wordmark, so changing that leaves the logo as it is', () => {
    const shared = new Set(containers(defaultWordmarkConfig));
    expect(containers(defaultLogoConfig).filter((c) => shared.has(c))).toEqual([]);
  });
});
