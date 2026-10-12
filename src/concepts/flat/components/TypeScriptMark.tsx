import type { EmblemModel } from '../engine';
import { SvgFrame, num, shapeId, type SvgFrameProps } from '../../../shared/react/SvgFrame';
import { TypeScriptTile } from './TypeScriptTile';

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
  return (
    <g id={shapeId(idPrefix, 'emblem')}>
      <g id={shapeId(idPrefix, 'layers')} style={{ isolation: 'isolate' }}>
        {emblem.layers.map((layer, i) => {
          const half = layer.size / 2;
          return (
            <rect
              key={layer.id}
              id={shapeId(idPrefix, layer.id)}
              x={num(-half)}
              y={num(-half)}
              width={num(layer.size)}
              height={num(layer.size)}
              rx={num(layer.cornerRadius)}
              fill={layer.fill}
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
