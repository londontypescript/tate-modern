import { bandColours, bandRect, isPlain, type SlotEdges, type SlotRecipe } from '../engine';

interface Props {
  recipe: SlotRecipe;
  edges: SlotEdges;
  canvas: { width: number; height: number };
  prefix: string;
}

/** The ids the edges paint with, under the image's own prefix so a file stays self-contained. */
export const edgeIds = (prefix: string) => ({ band: `${prefix}-band`, corners: `${prefix}-corners` });

/** The recipe's band width and corner radius, refusing edges on an image that doesn't offer them. */
function sizes(recipe: SlotRecipe, edges: SlotEdges) {
  if (isPlain(edges)) return undefined;
  if (!recipe.edges) throw new Error(`The ${recipe.id} slot offers no band or rounded corners`);
  return recipe.edges;
}

/**
 * The band's colours as a gradient running the length of whatever it fills:
 * down a side band, across a top or bottom one. The banner paints its band
 * with it too.
 */
export function BandGradient({ id, runs }: { id: string; runs: 'down' | 'across' }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={runs === 'down' ? 0 : 1} y2={runs === 'down' ? 1 : 0}>
      {bandColours.map((colour, n) => (
        <stop key={colour} offset={n / (bandColours.length - 1)} stopColor={colour} />
      ))}
    </linearGradient>
  );
}

/** The band's gradient and the corners' clip, for the image's `<defs>`; nothing when the edges are plain. */
export function SlotEdgeDefs({ recipe, edges, canvas, prefix }: Props) {
  const size = sizes(recipe, edges);
  if (!size) return null;
  const id = edgeIds(prefix);
  const runsDown = edges.band === 'left' || edges.band === 'right';
  return (
    <defs>
      {edges.band !== 'off' && <BandGradient id={id.band} runs={runsDown ? 'down' : 'across'} />}
      {edges.corners === 'on' && (
        <clipPath id={id.corners}>
          <rect width={canvas.width} height={canvas.height} rx={size.cornerRadius} />
        </clipPath>
      )}
    </defs>
  );
}

/** The band along its edge, over the background and under the logo, which it never reaches. */
export function SlotBand({ recipe, edges, canvas, prefix }: Props) {
  const size = sizes(recipe, edges);
  if (!size || edges.band === 'off') return null;
  const { x, y, width, height } = bandRect(canvas, edges.band, size.bandWidth);
  return <rect x={x} y={y} width={width} height={height} fill={`url(#${edgeIds(prefix).band})`} />;
}
