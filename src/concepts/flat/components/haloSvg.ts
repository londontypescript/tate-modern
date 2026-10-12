/**
 * Reads back the halo as written, for tests: its group, its mask's pieces
 * in paint order, its gradients, and what the mask's level is at a point,
 * modelled from those written pieces alone.
 */
import { elements } from './svgParse';

type Attrs = Record<string, string>;
interface Stop {
  offset: number;
  level: number;
}
interface Gradient {
  kind: 'linear' | 'radial';
  attrs: Attrs;
  /** The stops exactly as written, for comparing serializations. */
  text: string;
  stops: Stop[];
}

/** The halo group as written. It holds no nested groups. */
export const haloMarkup = (svg: string) => /<g id="[^"]*halo"[^>]*>.*?<\/g>/.exec(svg)?.[0] ?? '';

/** The level of an 8-bit grey `#rrggbb` written with equal channels. */
function greyLevel(colour: string | undefined): number {
  const match = /^#([0-9a-f]{2})\1\1$/.exec(colour ?? '');
  if (!match) throw new Error(`not a grey: ${colour}`);
  return parseInt(match[1] ?? '', 16) / 255;
}

export function gradients(markup: string): Map<string, Gradient> {
  const out = new Map<string, Gradient>();
  for (const m of markup.matchAll(/<(linear|radial)Gradient ([^>]*)>(.*?)<\/\1Gradient>/g)) {
    const attrs = elements(`<g ${m[2]}>`, 'g')[0] ?? {};
    const text = m[3] ?? '';
    const stops = elements(text, 'stop').map((s) => ({ offset: Number(s.offset), level: greyLevel(s['stop-color']) }));
    out.set(attrs.id ?? '', { kind: m[1] as Gradient['kind'], attrs, text, stops });
  }
  return out;
}

/** A piecewise-linear gradient's level at `u`, padded with its end stops. */
export function levelAt(stops: readonly Stop[], u: number): number {
  const first = stops[0];
  const last = stops.at(-1);
  if (!first || !last) return NaN;
  if (u <= first.offset) return first.level;
  if (u >= last.offset) return last.level;
  const i = stops.findIndex((s) => s.offset >= u);
  const [a, b] = [stops[i - 1] ?? first, stops[i] ?? last];
  return a.level + ((b.level - a.level) * (u - a.offset)) / (b.offset - a.offset);
}

interface RectPiece {
  kind: 'rect';
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
export interface ArcPiece {
  kind: 'arc';
  /** The path's first point, which the piece claims as its centre. */
  from: { x: number; y: number };
  start: { x: number; y: number };
  end: { x: number; y: number };
  rx: number;
  ry: number;
  large: number;
  sweep: number;
}

/** A mask piece's path: `M x y H x V y H x Z` (a rectangle) or `M cx cy H x A rx ry 0 large sweep x y Z`. */
function parsePiece(d: string): RectPiece | ArcPiece {
  const n = String.raw`(-?[\d.]+)`;
  const rect = new RegExp(`^M${n} ${n}H${n}V${n}H${n}Z$`).exec(d);
  if (rect) {
    const [x0, y0, x1, y1] = rect.slice(1, 5).map(Number) as [number, number, number, number];
    return {
      kind: 'rect',
      minX: Math.min(x0, x1),
      minY: Math.min(y0, y1),
      maxX: Math.max(x0, x1),
      maxY: Math.max(y0, y1),
    };
  }
  const arc = new RegExp(`^M${n} ${n}H${n}A${n} ${n} 0 ([01]) ([01]) ${n} ${n}Z$`).exec(d);
  if (!arc) throw new Error(`unexpected halo piece: ${d}`);
  const [cx = NaN, cy = NaN, sx = NaN, rx = NaN, ry = NaN, large = NaN, sweep = NaN, ex = NaN, ey = NaN] = arc
    .slice(1)
    .map(Number);
  return { kind: 'arc', from: { x: cx, y: cy }, start: { x: sx, y: cy }, end: { x: ex, y: ey }, rx, ry, large, sweep };
}

/**
 * The centre the written arc actually turns about. With radii equal to its
 * depths, an arc between the two points has two possible centres; the
 * sweep flag (with the small arc) picks the one it goes round clockwise
 * (sweep 1) or anticlockwise (0), less than half a turn.
 */
export function arcCentre(arc: ArcPiece) {
  const candidates = [
    { x: arc.end.x, y: arc.start.y },
    { x: arc.start.x, y: arc.end.y },
  ];
  return candidates.find((c) => {
    const a1 = Math.atan2(arc.start.y - c.y, arc.start.x - c.x);
    const a2 = Math.atan2(arc.end.y - c.y, arc.end.x - c.x);
    const turn = Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1));
    return arc.large === 0 && (turn > 0 ? 1 : 0) === arc.sweep;
  });
}

function contains(piece: RectPiece | ArcPiece, x: number, y: number): boolean {
  if (piece.kind === 'rect') return x >= piece.minX && x <= piece.maxX && y >= piece.minY && y <= piece.maxY;
  const c = arcCentre(piece);
  if (!c) return false;
  // The path runs from its first point out along one radius, round the arc
  // and back, inside the box the two radii span. When the arc turns about
  // that first point the piece is the quarter disc; when it turns about the
  // far corner instead (a reversed sweep), the piece is what lies between
  // the arc and the first point, outside the ellipse.
  const [dx, dy] = [(x - c.x) / piece.rx, (y - c.y) / piece.ry];
  const inEllipse = dx * dx + dy * dy <= 1;
  const sx = Math.sign(piece.start.x - piece.from.x);
  const sy = Math.sign(piece.end.y - piece.from.y);
  const inQuadrant =
    Math.sign(x - piece.from.x) !== -sx &&
    Math.sign(y - piece.from.y) !== -sy &&
    Math.abs(x - piece.from.x) <= piece.rx &&
    Math.abs(y - piece.from.y) <= piece.ry;
  const fromIsCentre = c.x === piece.from.x && c.y === piece.from.y;
  return inQuadrant && (fromIsCentre ? inEllipse : !inEllipse);
}

/** The mask as written: its attributes and its pieces in paint order. */
export function maskOf(markup: string) {
  const m = /<mask ([^>]*)>(.*?)<\/mask>/.exec(markup);
  const attrs = elements(`<g ${m?.[1] ?? ''}>`, 'g')[0] ?? {};
  const pieces = elements(m?.[2] ?? '', 'path').map((p) => ({ attrs: p, shape: parsePiece(p.d ?? '') }));
  return { attrs, pieces };
}

/**
 * The mask's level at a point: the last piece painted there wins, since
 * every piece is opaque. A gradient fill is evaluated from its written
 * attributes and stops; outside every piece the mask is black.
 */
export function maskSampler(markup: string): (x: number, y: number) => number {
  const grads = gradients(markup);
  const { pieces } = maskOf(markup);
  return (x, y) => levelOf(grads, pieces, x, y);
}

function levelOf(
  grads: Map<string, Gradient>,
  pieces: ReturnType<typeof maskOf>['pieces'],
  x: number,
  y: number,
): number {
  for (let i = pieces.length - 1; i >= 0; i--) {
    const piece = pieces[i];
    if (!piece || !contains(piece.shape, x, y)) continue;
    const fill = piece.attrs.fill ?? '';
    const ref = /^url\(#(.+)\)$/.exec(fill)?.[1];
    if (!ref) return greyLevel(fill);
    const g = grads.get(ref);
    if (!g) return NaN;
    const a = (k: string) => Number(g.attrs[k]);
    if (g.kind === 'radial') return levelAt(g.stops, Math.hypot(x - a('cx'), y - a('cy')) / a('r'));
    const [vx, vy] = [a('x2') - a('x1'), a('y2') - a('y1')];
    return levelAt(g.stops, ((x - a('x1')) * vx + (y - a('y1')) * vy) / (vx * vx + vy * vy));
  }
  return 0;
}
