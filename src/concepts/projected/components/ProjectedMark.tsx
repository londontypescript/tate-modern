import type { Box } from '../../../shared';
import { SvgFrame, num, shapeId, type SvgFrameProps } from '../../../shared/react/SvgFrame';
import type { ProjectedEmblem, ProjectedFace } from '../engine';

const pointsAttr = (face: ProjectedFace) => face.points.map((p) => `${num(p.x)},${num(p.y)}`).join(' ');

/** Gradient ids are prefixed per drawing, so several can share a page. */
const gradientId = (prefix: string, face: ProjectedFace) => `${prefix}-${face.id}-shade`;

/** The projected emblem's polygons (and lettering) in paint order. */
export function ProjectedShapes({ emblem, idPrefix }: { emblem: ProjectedEmblem; idPrefix?: string }) {
  const prefix = idPrefix ?? 'lts-projected';
  const faces = emblem.items.filter((item): item is ProjectedFace => item.type === 'face');
  return (
    <g id={shapeId(idPrefix, 'emblem')}>
      <defs>
        {faces.map((face) =>
          face.gradient ? (
            <linearGradient
              key={face.id}
              id={gradientId(prefix, face)}
              gradientUnits="userSpaceOnUse"
              x1={num(face.gradient.from.x)}
              y1={num(face.gradient.from.y)}
              x2={num(face.gradient.to.x)}
              y2={num(face.gradient.to.y)}
            >
              <stop offset="0" stopColor={face.gradient.fromColour} />
              <stop offset="1" stopColor={face.gradient.toColour} />
            </linearGradient>
          ) : null,
        )}
      </defs>
      {emblem.items.map((item, i) =>
        item.type === 'face' ? (
          <polygon
            key={item.id}
            id={shapeId(idPrefix, item.id)}
            points={pointsAttr(item)}
            fill={item.gradient ? `url(#${gradientId(prefix, item)})` : item.fill}
            fillOpacity={item.opacity < 1 ? num(item.opacity) : undefined}
          />
        ) : (
          <g
            key={`lettering-${i}`}
            id={shapeId(idPrefix, 'lettering')}
            transform={`matrix(${item.matrix.map((v) => num(v)).join(' ')})`}
            fill={item.colour}
          >
            {emblem.lettering.map((glyph) => (
              <path key={glyph.id} d={glyph.d} />
            ))}
          </g>
        ),
      )}
    </g>
  );
}

export function ProjectedMark({
  emblem,
  bounds = emblem.bounds,
  title = 'London TypeScript emblem',
  idPrefix,
  ...frame
}: SvgFrameProps & { emblem: ProjectedEmblem; bounds?: Box }) {
  return (
    <SvgFrame bounds={bounds} title={title} {...frame}>
      <ProjectedShapes emblem={emblem} idPrefix={idPrefix} />
    </SvgFrame>
  );
}
