import type { Font } from 'opentype.js';
import { palette } from '../../shared/palette';
import { layoutTextRun } from '../../shared/typography';
import type { Gradient, Group } from './types';

/**
 * The emblem inside the bubble: the sunset fan of five equal rounded panes,
 * the blue tile and its "TS", drawn in its own 240 box as the reference's
 * `panes` emblem, then scaled into the sphere.
 */

/** The panes from back to front, each the same square turned about the centre. */
const panes = [
  { rotate: -60, colour: palette.sunsetPlum },
  { rotate: -46, colour: palette.sunsetMagenta },
  { rotate: -32, colour: palette.sunsetPink },
  { rotate: -18, colour: palette.sunsetOrange },
  { rotate: -6, colour: palette.sunsetGold },
] as const;

const pane = { x: 60, y: 60, size: 120, rx: 14 } as const;
const tile = { x: 62, y: 62, size: 116, rx: 14 } as const;

/** Each pane fades to this opacity along its diagonal. */
const paneFade = 0.82;

/** The emblem's size inside the bubble, scaled about the centre. */
const coreScale = 0.9;

/**
 * "TS" as the reference sets it: Open Sans 800 at 52, baseline 168, centred
 * on x 145, letter spacing -2. A browser adds the spacing after every glyph,
 * the last included, and centres that whole advance, so this does the same.
 */
const tileText = { text: 'TS', fontSize: 52, baseline: 168, centreX: 145, letterSpacing: -2 } as const;

/** The tile's "TS" as one outline, from the Open Sans 800 font. */
export function tileLettering(sans: Font): string {
  const run = {
    baseline: tileText.baseline,
    fontSize: tileText.fontSize,
    letterSpacing: tileText.letterSpacing / tileText.fontSize,
  };
  const width = layoutTextRun(sans, tileText.text, { ...run, x: 0 }).endX;
  const { glyphs } = layoutTextRun(sans, tileText.text, { ...run, x: tileText.centreX - width / 2 });
  return glyphs.map((g) => g.d).join('');
}

const diagonal = { x1: 0, y1: 0, x2: 1, y2: 1 } as const;

export function emblemGradients(): Gradient[] {
  return [
    ...panes.map(({ colour }, i): Gradient => ({
      kind: 'linear',
      id: `pane${i}`,
      ...diagonal,
      stops: [
        { offset: 0, colour },
        { offset: 1, colour, opacity: paneFade },
      ],
    })),
    {
      kind: 'linear',
      id: 'tile',
      ...diagonal,
      stops: [
        { offset: 0, colour: palette.liftedBlue },
        { offset: 1, colour: palette.blue },
      ],
    },
  ];
}

/** The emblem, scaled into the sphere; `lettering` is `tileLettering`'s outline. */
export function emblemLayer(lettering: string): Group {
  return {
    kind: 'group',
    name: 'core',
    transform: { scale: coreScale, cx: 120, cy: 120 },
    children: [
      ...panes.map(({ rotate }, i) => ({
        kind: 'rect' as const,
        x: pane.x,
        y: pane.y,
        width: pane.size,
        height: pane.size,
        rx: pane.rx,
        fill: { gradient: `pane${i}` },
        transform: { rotate, cx: 120, cy: 120 },
      })),
      {
        kind: 'rect',
        x: tile.x,
        y: tile.y,
        width: tile.size,
        height: tile.size,
        rx: tile.rx,
        fill: { gradient: 'tile' },
      },
      { kind: 'path', d: 'M70,70 h60 l-60,30 Z', fill: palette.white, fillOpacity: 0.18 },
      { kind: 'path', d: lettering, fill: palette.white },
    ],
  };
}
