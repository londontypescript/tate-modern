/**
 * Reads back what the renderers wrote, for tests that check the SVG text
 * itself rather than the engine's full-precision numbers.
 */
import type { Box } from '../../../shared';

const DEG = Math.PI / 180;

/** Every `<tag …>` element of one kind, as its attributes. */
export function elements(svg: string, tag: string): Record<string, string>[] {
  return [...svg.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))].map((m) =>
    Object.fromEntries(
      [...(m[1] ?? '').matchAll(/([\w:-]+)="([^"]*)"/g)].map((a): [string, string] => [a[1] ?? '', a[2] ?? '']),
    ),
  );
}

export function viewBox(svg: string): Box {
  const [minX = NaN, minY = NaN, width = NaN, height = NaN] = (/viewBox="([^"]+)"/.exec(svg)?.[1] ?? '')
    .split(' ')
    .map(Number);
  return { minX, minY, maxX: minX + width, maxY: minY + height };
}

/** The transform of a sheet as written: an optional `translate(x y)` then `rotate(r)`. */
export function parseTransform(transform: string) {
  const match = /^(?:translate\((-?[\d.]+) (-?[\d.]+)\) )?rotate\((-?[\d.]+)\)$/.exec(transform);
  if (!match) throw new Error(`unexpected transform: ${transform}`);
  return { x: Number(match[1] ?? 0), y: Number(match[2] ?? 0), rotation: Number(match[3]) };
}

/** The bounds of a written rounded `<rect>` after its transform, from its attributes alone. */
export function writtenRectBox(rect: Record<string, string>): Box {
  const [x, y, w, h, rx] = ['x', 'y', 'width', 'height', 'rx'].map((k) => Number(rect[k] ?? 0)) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const r = Math.min(rx, w / 2, h / 2);
  const t = parseTransform(rect.transform ?? 'rotate(0)');
  const [cos, sin] = [Math.cos(t.rotation * DEG), Math.sin(t.rotation * DEG)];
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  // A rounded rectangle is the hull of the circles at its inner corners.
  for (const cx of [x + r, x + w - r]) {
    for (const cy of [y + r, y + h - r]) {
      const px = t.x + cx * cos - cy * sin;
      const py = t.y + cx * sin + cy * cos;
      box.minX = Math.min(box.minX, px - r);
      box.maxX = Math.max(box.maxX, px + r);
      box.minY = Math.min(box.minY, py - r);
      box.maxY = Math.max(box.maxY, py + r);
    }
  }
  return box;
}
