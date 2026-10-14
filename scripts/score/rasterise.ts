/**
 * Turns a candidate's static mark into pixels comparable with the
 * reference: the studio's own SVG export, re-framed on a fixed canvas the
 * size of `mark.png` so its tile lands on the original's, then drawn by
 * resvg at 1:1.
 *
 * The frame comes only from the registration and the tile, never from the
 * mark's own bounds, which change from one candidate to the next.
 */
import { Resvg } from '@resvg/resvg-js';
import { renderLogoSvg } from '../../src/concepts/flat/components/renderSvg';
import type { LogoModel, TileModel } from '../../src/concepts/flat/engine';
import type { Point } from '../../src/shared';
import { fromRgba, type RgbImage } from './image';
import type { Registration } from './reference';

/**
 * Where emblem units land on the canvas. The tile's top-left is (x, y), so
 * its centre is (x + size/2, y + size/2); that centre goes to the
 * registered centre (plus `offset`, a shift injected after the transform),
 * scaled so the tile's side is the registered side.
 */
export function placement(tile: TileModel, registration: Registration, offset: Point = { x: 0, y: 0 }) {
  const scale = registration.side / tile.size;
  const centre = { x: tile.x + tile.size / 2, y: tile.y + tile.size / 2 };
  const target = { x: registration.centre.x + offset.x, y: registration.centre.y + offset.y };
  const { width, height } = registration.canvas;
  return {
    scale,
    toCanvas: (p: Point): Point => ({ x: target.x + (p.x - centre.x) * scale, y: target.y + (p.y - centre.y) * scale }),
    /** The canvas in emblem units, for the SVG's viewBox. */
    viewBox: {
      x: centre.x - target.x / scale,
      y: centre.y - target.y / scale,
      width: width / scale,
      height: height / scale,
    },
  };
}

const hex = ([r, g, b]: readonly number[]) =>
  `#${[r, g, b].map((v) => (v ?? 0).toString(16).padStart(2, '0')).join('')}`;

/**
 * The candidate as a standalone SVG on the canvas, background colour
 * first, and whether any of its art falls outside the canvas.
 */
export function candidateSvg(logo: LogoModel, registration: Registration, offset?: Point) {
  const { emblem } = logo;
  const place = placement(emblem.tile, registration, offset);
  const { width, height } = registration.canvas;
  const min = place.toCanvas({ x: emblem.bounds.minX, y: emblem.bounds.minY });
  const max = place.toCanvas({ x: emblem.bounds.maxX, y: emblem.bounds.maxY });
  const clipped = min.x < 0 || min.y < 0 || max.x > width || max.y > height;

  // The export's own frame is replaced; only what it draws is kept.
  const exported = renderLogoSvg('mark', logo);
  const inner = /<svg[^>]*>(?:<title>[^<]*<\/title>)?([\s\S]*)<\/svg>\s*$/.exec(exported)?.[1];
  if (inner === undefined) throw new Error('renderLogoSvg: unexpected output');
  const vb = place.viewBox;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="${vb.x} ${vb.y} ${vb.width} ${vb.height}">` +
    `<rect x="${vb.x}" y="${vb.y}" width="${vb.width}" height="${vb.height}" fill="${hex(registration.background)}"/>` +
    `${inner}</svg>`;
  return { svg, clipped };
}

/** Draws an SVG with resvg at its own size (1:1), checking the size and that it is opaque. */
export function renderWithResvg(svg: string, size: { width: number; height: number }): RgbImage {
  const rendered = new Resvg(svg, { fitTo: { mode: 'original' }, font: { loadSystemFonts: false } }).render();
  if (rendered.width !== size.width || rendered.height !== size.height) {
    throw new Error(`resvg: expected ${size.width} × ${size.height}, got ${rendered.width} × ${rendered.height}`);
  }
  return fromRgba(rendered.width, rendered.height, new Uint8Array(rendered.pixels), 'resvg');
}
