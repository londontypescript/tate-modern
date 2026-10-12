import type { EmblemModel, SquareLayer } from '../engine';
import { SvgFrame, num, shapeId, type SvgFrameProps } from '../../../shared/react/SvgFrame';
import { TypeScriptTile } from './TypeScriptTile';

/** Short deterministic hash, so equal fades share an id and different ones never do. */
const hash = (text: string) => {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

/**
 * Id of a square's fade gradient. Derived from everything that shapes the
 * gradient, so several logos on one page never pick up each other's fades.
 */
const fadeId = (prefix: string | undefined, layer: SquareLayer) =>
  layer.fade &&
  `${prefix ?? 'lts'}-fade-${layer.index}-${hash(
    `${layer.fill}|${layer.fade.colour}|${num(layer.fade.angle)}|${num(layer.fade.strength)}`,
  )}`;

/**
 * A square's fade, in its own bounding box so it turns with the square:
 * full strength in the square's colour on one edge, fading towards the
 * fade colour (and transparency) on the opposite edge.
 */
function FadeGradient({ id, layer }: { id: string; layer: SquareLayer }) {
  const fade = layer.fade;
  if (!fade) return null;
  const theta = (fade.angle * Math.PI) / 180;
  const dx = Math.cos(theta) / 2;
  const dy = Math.sin(theta) / 2;
  return (
    <linearGradient id={id} x1={num(0.5 - dx)} y1={num(0.5 - dy)} x2={num(0.5 + dx)} y2={num(0.5 + dy)}>
      <stop offset="0" stopColor={layer.fill} />
      <stop offset="1" stopColor={fade.colour} stopOpacity={num(1 - fade.strength)} />
    </linearGradient>
  );
}

export interface MarkShapesProps {
  emblem: EmblemModel;
  /** Current layer rotations; the static composition when omitted. */
  rotations?: readonly number[];
  idPrefix?: string;
}

/**
 * The emblem as an SVG group centred on (0, 0). Every square is its own
 * <rect>, rotated about the shared origin with an SVG `rotate()` attribute
 * (not CSS transform-origin), which behaves identically in every browser.
 */
export function MarkShapes({ emblem, rotations, idPrefix }: MarkShapesProps) {
  const fades = emblem.layers.map((layer) => fadeId(idPrefix, layer));
  return (
    <g id={shapeId(idPrefix, 'emblem')}>
      {fades.some(Boolean) && (
        <defs>
          {emblem.layers.map((layer, i) => {
            const id = fades[i];
            return id ? <FadeGradient key={id} id={id} layer={layer} /> : null;
          })}
        </defs>
      )}
      <g id={shapeId(idPrefix, 'layers')} style={{ isolation: 'isolate' }}>
        {emblem.layers.map((layer, i) => {
          const half = layer.size / 2;
          const fade = fades[i];
          return (
            <rect
              key={layer.id}
              id={shapeId(idPrefix, layer.id)}
              x={num(-half)}
              y={num(-half)}
              width={num(layer.size)}
              height={num(layer.size)}
              rx={num(layer.cornerRadius)}
              fill={fade ? `url(#${fade})` : layer.fill}
              opacity={num(layer.opacity)}
              style={layer.blendMode === 'normal' ? undefined : { mixBlendMode: layer.blendMode }}
              transform={`rotate(${num(rotations?.[i] ?? layer.rotation)})`}
            />
          );
        })}
      </g>
      <TypeScriptTile tile={emblem.tile} idPrefix={idPrefix} />
    </g>
  );
}

export interface TypeScriptMarkProps extends SvgFrameProps, MarkShapesProps {
  /**
   * `tight` frames the static composition exactly; `rotation-safe` leaves
   * room for every square at any angle, so animation never clips.
   */
  framing?: 'tight' | 'rotation-safe';
}

export function TypeScriptMark({
  emblem,
  rotations,
  framing = 'tight',
  title = 'London TypeScript emblem',
  idPrefix,
  ...frame
}: TypeScriptMarkProps) {
  const bounds = framing === 'tight' ? emblem.bounds : emblem.rotationSafeBounds;
  return (
    <SvgFrame bounds={bounds} title={title} {...frame}>
      <MarkShapes emblem={emblem} rotations={rotations} idPrefix={idPrefix} />
    </SvgFrame>
  );
}
