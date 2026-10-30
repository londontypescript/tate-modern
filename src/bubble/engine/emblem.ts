import type { Font } from 'opentype.js';
import { palette } from '../../shared/palette';
import { layoutTextRun } from '../../shared/typography';
import type { Detail } from './detail';
import type { Gradient, Group, Node } from './types';

/**
 * The emblem inside the bubble: the sunset fan of five equal rounded panes,
 * the blue tile and its "TS", drawn in its own 240 box as the reference's
 * `panes` emblem, then scaled into the sphere.
 */

/** The panes from back to front, each the same square turned about the centre. */
export const panes = [
  { rotate: -60, colour: palette.sunsetPlum },
  { rotate: -46, colour: palette.sunsetMagenta },
  { rotate: -32, colour: palette.sunsetPink },
  { rotate: -18, colour: palette.sunsetOrange },
  { rotate: -6, colour: palette.sunsetGold },
] as const;

export const pane = { x: 60, y: 60, size: 120, rx: 14 } as const;
const tile = { x: 62, y: 62, size: 116, rx: 14 } as const;

/** Each pane fades to this opacity along its diagonal. */
const paneFade = 0.82;

/**
 * How each step draws the emblem. `core` scales the whole emblem about the
 * centre (0.9 fits it inside the full bubble); without a bubble it grows
 * until its panes nearly reach the sphere's circle. `lettering` scales the
 * TS about the tile's bottom-right corner, so it grows into the tile while
 * keeping its corner placement, or leaves it out where it can't be read.
 * `tile` scales the tile about the centre, uncovering more of the fan.
 */
interface EmblemLook {
  core: number;
  lettering: number | false;
  gloss: boolean;
  tile: number;
}

export const emblemLooks: Record<Detail, EmblemLook> = {
  full: { core: 0.9, lettering: 1, gloss: true, tile: 1 },
  small: { core: 1, lettering: 1.3, gloss: true, tile: 1 },
  tiny: { core: 1.3, lettering: 1.45, gloss: false, tile: 1 },
  none: { core: 1.3, lettering: false, gloss: false, tile: 0.75 },
};

/** The point the TS is scaled about: the tile's bottom-right corner. */
const letteringAnchor = { cx: tile.x + tile.size, cy: tile.y + tile.size } as const;

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

/** The emblem as `detail` draws it, scaled into the sphere; `lettering` is `tileLettering`'s outline. */
export function emblemLayer(lettering: string, detail: Detail): Group {
  const look = emblemLooks[detail];
  const centre = { cx: 120, cy: 120 };
  const children: Node[] = [
    ...panes.map(({ rotate }, i) => ({
      kind: 'rect' as const,
      x: pane.x,
      y: pane.y,
      width: pane.size,
      height: pane.size,
      rx: pane.rx,
      fill: { gradient: `pane${i}` },
      transform: { rotate, ...centre },
    })),
    {
      kind: 'rect',
      x: tile.x,
      y: tile.y,
      width: tile.size,
      height: tile.size,
      rx: tile.rx,
      fill: { gradient: 'tile' },
      ...(look.tile === 1 ? {} : { transform: { scale: look.tile, ...centre } }),
    },
  ];
  if (look.gloss) children.push({ kind: 'path', d: 'M70,70 h60 l-60,30 Z', fill: palette.white, fillOpacity: 0.18 });
  if (look.lettering !== false) {
    children.push({
      kind: 'path',
      d: lettering,
      fill: palette.white,
      ...(look.lettering === 1 ? {} : { transform: { scale: look.lettering, ...letteringAnchor } }),
    });
  }
  return { kind: 'group', name: 'core', transform: { scale: look.core, ...centre }, children };
}
