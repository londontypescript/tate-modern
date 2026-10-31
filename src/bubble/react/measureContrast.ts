import { Resvg } from '@resvg/resvg-js';
import { createElement } from 'react';
import { standaloneSvg } from '../../shared/react/standaloneSvg';
import { contrastRatio } from '../wordmark/contrast';
import { boxSize, type BubbleDrawing, type Group, type Node } from '../engine';
import { BubbleSvg } from './BubbleSvg';

/**
 * Contrast measured from what a drawing actually paints, for the tests:
 * palette constants alone miss the gloss, the glass and the gradients laid
 * over the tile. Each drawing is rasterised by resvg on its ground, and each
 * element is found by rendering it alone, opaque, as a coverage mask.
 */

const width = 480;

const raster = (drawing: BubbleDrawing, background?: string) =>
  new Resvg(
    standaloneSvg('probe', (idPrefix) => createElement(BubbleSvg, { drawing, idPrefix, size: boxSize }), 'probe'),
    {
      fitTo: { mode: 'width', value: width },
      ...(background === undefined ? {} : { background }),
    },
  ).render().pixels;

type Pick = (node: Node) => boolean;

/** Maps every shape, inside its groups; `null` leaves a shape out, and empty groups go with it. */
function mapShapes(drawing: BubbleDrawing, map: (node: Node) => Node | null): BubbleDrawing {
  const walk = (node: Node): Node | null => {
    if (node.kind !== 'group') return map(node);
    const children = node.children.map(walk).filter((c): c is Node => c !== null);
    return children.length > 0 ? { ...node, children } : null;
  };
  return { ...drawing, layers: drawing.layers.map(walk).filter((l): l is Group => l !== null && l.kind === 'group') };
}

/** Only the picked shapes, opaque black, with no clip, blur or group paint: where they cover. */
const coverage = (drawing: BubbleDrawing, pick: Pick) => {
  const bare = mapShapes(drawing, (n) =>
    pick(n) ? { ...n, fill: '#000000', fillOpacity: 1, stroke: undefined, filter: undefined } : null,
  );
  const strip = (node: Node): Node =>
    node.kind === 'group'
      ? {
          ...node,
          clip: undefined,
          filter: undefined,
          fill: undefined,
          stroke: undefined,
          children: node.children.map(strip),
        }
      : node;
  return raster({ ...bare, layers: bare.layers.map((l) => strip(l) as Group) });
};

const hex = (pixels: Uint8Array, i: number) =>
  `#${[0, 1, 2].map((c) => (pixels[i + c] ?? 0).toString(16).padStart(2, '0')).join('')}`;

export interface ContrastSample {
  /** The lowest ratio among the measured pixels. */
  min: number;
  /** The share of measured pixels at or above `target`. */
  share: (target: number) => number;
  count: number;
}

// A loop rather than Math.min(...ratios): a large render has more pixels than a call can take as arguments.
const sample = (ratios: number[]): ContrastSample => ({
  min: ratios.reduce((a, b) => Math.min(a, b), Infinity),
  share: (target) => ratios.filter((r) => r >= target).length / ratios.length,
  count: ratios.length,
});

/**
 * `foreground` against what lies behind it: each pixel it fully covers,
 * drawn with it and without it, on `ground`.
 */
export function contrastOver(drawing: BubbleDrawing, ground: string, foreground: Pick): ContrastSample {
  const withIt = raster(drawing, ground);
  const withoutIt = raster(
    mapShapes(drawing, (n) => (foreground(n) ? null : n)),
    ground,
  );
  const mask = coverage(drawing, foreground);
  const ratios: number[] = [];
  for (let i = 0; i < mask.length; i += 4) {
    if (mask[i + 3] === 255) ratios.push(contrastRatio(hex(withIt, i), hex(withoutIt, i)));
  }
  return sample(ratios);
}

/**
 * `element` as painted (whatever lies over it included) against the bare
 * ground, at each pixel it fully covers that `except` doesn't touch at all.
 */
export function contrastAgainstGround(
  drawing: BubbleDrawing,
  ground: string,
  element: Pick,
  except: Pick,
): ContrastSample {
  const painted = raster(drawing, ground);
  const mask = coverage(drawing, element);
  const excluded = coverage(drawing, except);
  const ratios: number[] = [];
  for (let i = 0; i < mask.length; i += 4) {
    if (mask[i + 3] === 255 && excluded[i + 3] === 0) ratios.push(contrastRatio(hex(painted, i), ground));
  }
  return sample(ratios);
}
