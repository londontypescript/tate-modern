import type { TileModel } from '../engine';
import { num, shapeId } from '../../../shared/react/SvgFrame';

/** The stationary central tile: base square, facet overlays, "TS". */
export function TypeScriptTile({ tile, idPrefix }: { tile: TileModel; idPrefix?: string }) {
  return (
    <g id={shapeId(idPrefix, 'tile')}>
      <rect
        x={num(tile.x)}
        y={num(tile.y)}
        width={num(tile.size)}
        height={num(tile.size)}
        rx={num(tile.cornerRadius)}
        fill={tile.fill}
      />
      {[...tile.facets, ...tile.lettering].map((shape) => (
        <path
          key={shape.id}
          id={shapeId(idPrefix, shape.id)}
          d={shape.d}
          fill={shape.fill}
          opacity={shape.opacity === undefined ? undefined : num(shape.opacity)}
        />
      ))}
    </g>
  );
}
