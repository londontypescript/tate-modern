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

const boxAttrs = ({ minX, minY, maxX, maxY }: Box) => ({
  x: num(minX),
  y: num(minY),
  width: num(maxX - minX),
  height: num(maxY - minY),
});

/**
 * The tile's halo, drawn without filters: one navy rectangle at the halo's
 * strength, seen through a luminance mask of opaque greys (white where the
 * shadow is full, black where it is clear). The mask's pieces are painted
 * core, corners, then strips, and the strips overlap the core and the
 * corners, so no join is ever left to two anti-aliased edges: a pale line
 * there would otherwise show in some browsers.
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
  const stops = halo.stops.map((s, i) => <stop key={i} offset={offsetNum(s.offset)} stopColor={s.grey} />);
  const fill = (name: string) => `${gradientPrefix}-halo-${name}`;
  const mask = fill('mask');
  return (
    <g id={shapeId(idPrefix, 'halo')}>
      <defs>
        {halo.strips.map(({ side, from, to }) => (
          <linearGradient
            key={side}
            id={fill(side)}
            gradientUnits="userSpaceOnUse"
            colorInterpolation="sRGB"
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
            colorInterpolation="sRGB"
            cx={num(centre.x)}
            cy={num(centre.y)}
            r={num(radius)}
          >
            {stops}
          </radialGradient>
        ))}
        <mask
          id={mask}
          maskUnits="userSpaceOnUse"
          mask-type="luminance"
          colorInterpolation="sRGB"
          {...boxAttrs(halo.box)}
        >
          <path id={shapeId(idPrefix, 'halo-core')} d={rectPath(halo.core)} fill="#ffffff" />
          {halo.patches.map(({ corner, centre, rx, ry, start, end, clockwise }) => (
            <path
              key={corner}
              id={shapeId(idPrefix, `halo-corner-${corner}`)}
              d={
                `M${num(centre.x)} ${num(centre.y)}H${num(start.x)}` +
                `A${num(rx)} ${num(ry)} 0 0 ${clockwise ? 1 : 0} ${num(end.x)} ${num(end.y)}Z`
              }
              fill={`url(#${fill(corner)})`}
            />
          ))}
          {halo.strips.map(({ side, paint }) => (
            <path
              key={side}
              id={shapeId(idPrefix, `halo-strip-${side}`)}
              d={rectPath(paint)}
              fill={`url(#${fill(side)})`}
            />
          ))}
        </mask>
      </defs>
      <rect
        id={shapeId(idPrefix, 'halo-shadow')}
        {...boxAttrs(halo.box)}
        fill={halo.colour}
        fillOpacity={num(halo.strength)}
        mask={`url(#${mask})`}
      />
    </g>
  );
}
