import { palette } from '../../shared/palette';
import { sphere } from './bounds';
import type { Blur, CircleClip, Gradient, Group, Node, Paints, Shape, Theme } from './types';

/**
 * The glass sphere around the emblem, as the reference draws it. The light
 * theme's glass has a pale body, a darker edge, an inner shade and fine
 * outlines, so it reads on white; the dark theme leaves those out and casts
 * a white ground shadow, so it reads on a dark page. Everything else is the
 * same in both.
 */

const { cx, cy, r } = sphere;
const white = palette.white;

/** The glass's own tints: specific to the bubble, so kept here rather than in the palette. */
export const glass = {
  shadowLight: '#1b2a4a',
  tint: '#9cc8ff',
  bodyBlue: '#bcd8ff',
  edge: '#3d5a8a',
  edgeDeep: '#2a3f66',
  rim: '#7aa8e0',
  outline: '#7f9fd0',
} as const;

const rainbow = ['#ff5fa2', '#ffcf7a', '#7dffb0', '#5cd6ff', '#9a7dff', '#ff5fa2'] as const;
const rainbowOffsets = [0, 0.22, 0.42, 0.62, 0.82, 1] as const;

/** The highlight's fade, from nearly white at its top left to clear. */
export const shineGradient = (): Gradient => ({
  kind: 'radial',
  id: 'shine',
  cx: 0.35,
  cy: 0.25,
  r: 0.6,
  stops: [
    { offset: 0, colour: white, opacity: 0.85 },
    { offset: 1, colour: white, opacity: 0 },
  ],
});

/** The light theme's pale glass body, clear at its top left and bluer towards the edge. */
export const lightBodyGradient = (): Gradient => ({
  kind: 'radial',
  id: 'lightBody',
  cx: 0.4,
  cy: 0.35,
  r: 0.65,
  stops: [
    { offset: 0, colour: white, opacity: 0 },
    { offset: 0.55, colour: '#e6effc', opacity: 0.35 },
    { offset: 0.85, colour: '#c4d7f2', opacity: 0.55 },
    { offset: 1, colour: '#9db6dc', opacity: 0.7 },
  ],
});

export function glassGradients(theme: Theme): Gradient[] {
  const both: Gradient[] = [
    {
      kind: 'radial',
      id: 'body',
      cx: 0.5,
      cy: 0.5,
      r: 0.5,
      stops: [
        { offset: 0.62, colour: white, opacity: 0 },
        { offset: 0.9, colour: glass.bodyBlue, opacity: 0.16 },
        { offset: 1, colour: white, opacity: 0.42 },
      ],
    },
    {
      kind: 'linear',
      id: 'rainbow',
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 1,
      stops: rainbow.map((colour, i) => ({ offset: rainbowOffsets[i] ?? 0, colour })),
    },
    shineGradient(),
  ];
  if (theme === 'dark') return both;
  return [
    ...both,
    lightBodyGradient(),
    {
      kind: 'radial',
      id: 'edge',
      cx: 0.5,
      cy: 0.5,
      r: 0.5,
      stops: [
        { offset: 0.78, colour: glass.edge, opacity: 0 },
        { offset: 0.95, colour: glass.edge, opacity: 0.2 },
        { offset: 1, colour: glass.edgeDeep, opacity: 0.38 },
      ],
    },
  ];
}

export const glassBlurs: Blur[] = [
  { id: 'soft', stdDeviation: 2.2, region: { x: -0.2, y: -0.2, width: 1.4, height: 1.4 } },
  // Tall, because the shadow's ellipse is flat and its blur spreads past it vertically.
  { id: 'blur4', stdDeviation: 4, region: { x: -0.5, y: -2, width: 2, height: 5 } },
];

export const glassClips: CircleClip[] = [{ id: 'ball', cx, cy, r }];

const groundShadow = (theme: Theme): Node => ({
  kind: 'ellipse',
  cx,
  cy: 230,
  rx: 72,
  ry: 7,
  fill: theme === 'light' ? glass.shadowLight : white,
  fillOpacity: theme === 'light' ? 0.22 : 0.2,
  filter: 'blur4',
});

/** A circle filling the sphere exactly. */
const ball = (paints: Paints): Shape => ({ kind: 'circle', cx, cy, r, ...paints });

export const shinePath = 'M40,96 C46,62 72,36 108,30 C78,44 58,68 52,100 Z';
/** The two window reflections, upper left, and how opaque each is. */
const windows = [
  { opacity: 0.7, rect: { x: 62, y: 44, width: 16, height: 22, rx: 4, transform: { rotate: -32, cx: 70, cy: 55 } } },
  { opacity: 0.55, rect: { x: 82, y: 34, width: 12, height: 17, rx: 3, transform: { rotate: -22, cx: 88, cy: 42 } } },
] as const;

/** The layers painted under the emblem: shadow, body and tint. */
export function glassBehind(theme: Theme): Group[] {
  return [
    {
      kind: 'group',
      name: 'ground',
      children:
        theme === 'light' ? [groundShadow(theme), ball({ fill: { gradient: 'lightBody' } })] : [groundShadow(theme)],
    },
    { kind: 'group', name: 'tint', children: [ball({ fill: glass.tint, fillOpacity: 0.08 })] },
  ];
}

/** The layers painted over the emblem, from the body's sheen to the outlines. */
export function glassInFront(theme: Theme): Group[] {
  const light = theme === 'light';
  const layers: (Group | false)[] = [
    { kind: 'group', name: 'body', children: [ball({ fill: { gradient: 'body' } })] },
    light && {
      kind: 'group',
      name: 'edge',
      children: [
        ball({ fill: { gradient: 'edge' } }),
        {
          kind: 'path',
          d: 'M196,92 A84,84 0 0 1 110,204',
          fill: 'none',
          stroke: glass.edgeDeep,
          strokeOpacity: 0.14,
          strokeWidth: 10,
          filter: 'soft',
        },
      ],
    },
    {
      kind: 'group',
      name: 'reflections',
      clip: 'ball',
      children: [
        {
          kind: 'circle',
          cx,
          cy,
          r: 107,
          fill: 'none',
          stroke: { gradient: 'rainbow' },
          strokeWidth: 10,
          strokeOpacity: 0.5,
          filter: 'soft',
        },
        {
          kind: 'path',
          d: 'M48,150 A80,80 0 0 0 192,150',
          fill: 'none',
          stroke: white,
          strokeOpacity: 0.28,
          strokeWidth: 5,
          filter: 'soft',
        },
      ],
    },
    {
      kind: 'group',
      name: 'rim',
      children: [
        { kind: 'circle', cx, cy, r: 111, fill: 'none', stroke: white, strokeOpacity: 0.75, strokeWidth: 1.6 },
        ball({ fill: 'none', stroke: glass.rim, strokeOpacity: 0.35, strokeWidth: 1 }),
      ],
    },
    { kind: 'group', name: 'shine', children: [{ kind: 'path', d: shinePath, fill: { gradient: 'shine' } }] },
    {
      kind: 'group',
      name: 'windows',
      children: windows.map(({ opacity, rect }) => ({
        kind: 'rect' as const,
        ...rect,
        fill: white,
        fillOpacity: opacity,
      })),
    },
    {
      kind: 'group',
      name: 'glint',
      children: [{ kind: 'circle', cx: 176, cy: 182, r: 5, fill: white, fillOpacity: 0.55 }],
    },
    light && {
      kind: 'group',
      name: 'outlines',
      fill: 'none',
      stroke: glass.outline,
      strokeOpacity: 0.6,
      strokeWidth: 1,
      children: [
        { kind: 'circle', cx, cy, r: 111.4, strokeWidth: 1.4 },
        ...windows.map(({ rect }) => ({ kind: 'rect' as const, ...rect })),
        { kind: 'path', d: 'M40,96 C46,62 72,36 108,30', strokeOpacity: 0.35 },
      ],
    },
  ];
  return layers.filter((layer): layer is Group => layer !== false);
}
