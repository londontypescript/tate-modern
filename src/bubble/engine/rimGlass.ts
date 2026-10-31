import { palette } from '../../shared/palette';
import { sphere } from './bounds';
import { glass, lightBodyGradient, shineGradient, shinePath } from './glass';
import type { Gradient, Group, Theme } from './types';

/**
 * The small step's glass: the full bubble's sheen, reflections, windows and
 * blurs smear into mush below about a 52 px sphere, so it keeps only what
 * still reads there: the body (pale in light, a faint tint in dark), a rim
 * thick enough to show at 30 px, and the one highlight.
 */

const { cx, cy, r } = sphere;

/** The rim's width in the 240 box: about 1 CSS px at a 37 px sphere. */
const rimWidth = 6;

export function rimGlassGradients(theme: Theme): Gradient[] {
  return theme === 'light' ? [shineGradient(), lightBodyGradient()] : [shineGradient()];
}

/** The body behind the emblem. */
export function rimGlassBehind(theme: Theme): Group {
  const tint = { kind: 'circle' as const, cx, cy, r, fill: glass.tint, fillOpacity: 0.08 };
  return {
    kind: 'group',
    name: 'ground',
    children: theme === 'light' ? [{ kind: 'circle', cx, cy, r, fill: { gradient: 'lightBody' } }, tint] : [tint],
  };
}

/** The rim and the highlight over the emblem. */
export function rimGlassInFront(theme: Theme): Group[] {
  const light = theme === 'light';
  return [
    {
      kind: 'group',
      name: 'rim',
      children: [
        {
          kind: 'circle',
          cx,
          cy,
          // Inset by half its width, so its outer edge is the sphere's.
          r: r - rimWidth / 2,
          fill: 'none',
          stroke: light ? glass.outline : palette.white,
          strokeOpacity: light ? 0.9 : 0.7,
          strokeWidth: rimWidth,
        },
      ],
    },
    { kind: 'group', name: 'shine', children: [{ kind: 'path', d: shinePath, fill: { gradient: 'shine' } }] },
  ];
}
