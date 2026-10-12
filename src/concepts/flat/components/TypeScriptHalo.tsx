import type { Box } from '../../../shared';
import type { HaloModel } from '../engine';
import { num, shapeId } from '../../../shared/react/SvgFrame';

/**
 * Stop offsets keep six decimals: three (as `num` writes) can make two
 * stops equal when the corner radius is large and the reach small.
 */
const offsetNum = (v: number) => Number(v.toFixed(6));

const rectPath = ({ minX, minY, maxX, maxY }: Box) =>
  `M${num(minX)} ${num(minY)}H${num(maxX)}V${num(maxY)}H${num(minX)}Z`;

/**
 * The tile's halo, drawn without filters: a flat core, four graded strips
 * and four graded quarter-disc corners that meet on exactly the same
 * written coordinates. They are drawn with `crispEdges`: anti-aliasing each
 * piece on its own leaves a pale line where two translucent pieces meet.
 * The outer edges are clear, so the unsmoothed curves don't show.
 *
 * `gradientPrefix` must be unique to this logo on the page.
 */
export function TypeScriptHalo({
  halo,
  gradientPrefix,
  idPrefix,
}: {
  halo: HaloModel;
  gradientPrefix: string;
  idPrefix?: string;
}) {
  // Written once and shared, so every piece fades by exactly the same stops.
  const stops = halo.stops.map((s, i) => (
    <stop key={i} offset={offsetNum(s.offset)} stopColor={halo.colour} stopOpacity={num(s.opacity)} />
  ));
  const fill = (name: string) => `${gradientPrefix}-halo-${name}`;
  return (
    <g id={shapeId(idPrefix, 'halo')} shapeRendering="crispEdges">
      <defs>
        {halo.strips.map(({ side, from, to }) => (
          <linearGradient
            key={side}
            id={fill(side)}
            gradientUnits="userSpaceOnUse"
            x1={num(from.x)}
            y1={num(from.y)}
            x2={num(to.x)}
            y2={num(to.y)}
          >
            {stops}
          </linearGradient>
        ))}
        {halo.patches.map(({ corner, centre, radius }) => (
          <radialGradient
            key={corner}
            id={fill(corner)}
            gradientUnits="userSpaceOnUse"
            cx={num(centre.x)}
            cy={num(centre.y)}
            r={num(radius)}
          >
            {stops}
          </radialGradient>
        ))}
      </defs>
      <path
        id={shapeId(idPrefix, 'halo-core')}
        d={rectPath(halo.core)}
        fill={halo.colour}
        fillOpacity={num(halo.strength)}
      />
      {halo.strips.map(({ side, rect }) => (
        <path key={side} id={shapeId(idPrefix, `halo-strip-${side}`)} d={rectPath(rect)} fill={`url(#${fill(side)})`} />
      ))}
      {halo.patches.map(({ corner, centre, radius, start, end, clockwise }) => (
        <path
          key={corner}
          id={shapeId(idPrefix, `halo-corner-${corner}`)}
          d={
            `M${num(centre.x)} ${num(centre.y)}H${num(start.x)}` +
            `A${num(radius)} ${num(radius)} 0 0 ${clockwise ? 1 : 0} ${num(end.x)} ${num(end.y)}Z`
          }
          fill={`url(#${fill(corner)})`}
        />
      ))}
    </g>
  );
}
