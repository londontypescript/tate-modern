import { palette } from '../../shared/palette';
import { bandRect, isPlain, type SlotEdges, type SlotRecipe } from '../engine';

/** The fan's panes from back to front: the band lays them flat in the same order. */
const fan = [palette.sunsetPlum, palette.sunsetMagenta, palette.sunsetPink, palette.sunsetOrange, palette.sunsetGold];

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

/** The band's gradient and the corners' clip, for the image's `<defs>`; nothing when the edges are plain. */
export function SlotEdgeDefs({ recipe, edges, canvas, prefix }: Props) {
  const size = sizes(recipe, edges);
  if (!size) return null;
  const id = edgeIds(prefix);
  const runsDown = edges.band === 'left' || edges.band === 'right';
  return (
    <defs>
      {edges.band !== 'off' && (
        <linearGradient id={id.band} x1="0" y1="0" x2={runsDown ? 0 : 1} y2={runsDown ? 1 : 0}>
          {fan.map((colour, n) => (
            <stop key={colour} offset={n / (fan.length - 1)} stopColor={colour} />
          ))}
        </linearGradient>
      )}
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
