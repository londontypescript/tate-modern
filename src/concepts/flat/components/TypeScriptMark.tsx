import { useId } from 'react';
import type { EmblemModel, SheetLayer } from '../engine';
import { SvgFrame, num, shapeId, type SvgFrameProps } from '../../../shared/react/SvgFrame';
import { TypeScriptTile } from './TypeScriptTile';

/**
 * A sheet's fade, in the sheet's own user space so it moves and turns with
 * it: full strength in the sheet's colour on one side, fading towards the
 * fade colour (and transparency) on the other. It spans the sheet's smaller
 * side, so a square fades exactly as it did when the gradient filled its
 * bounding box, and a stretched sheet's fade keeps its true angle.
 */
function FadeGradient({ id, layer }: { id: string; layer: SheetLayer }) {
  const fade = layer.fade;
  if (!fade) return null;
  const theta = (fade.angle * Math.PI) / 180;
  const reach = Math.min(layer.width, layer.height) / 2;
  const dx = reach * Math.cos(theta);
  const dy = reach * Math.sin(theta);
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={num(-dx)} y1={num(-dy)} x2={num(dx)} y2={num(dy)}>
      <stop offset="0" stopColor={layer.fill} />
      <stop offset="1" stopColor={fade.colour} stopOpacity={num(1 - fade.strength)} />
    </linearGradient>
  );
}

/**
 * Where a sheet sits and how it is turned. It is drawn centred on (0, 0)
 * and moved to its centre afterwards, so it turns about its own centre and
 * that pivot stays exact however the numbers are rounded. A sheet at the
 * origin is written as plain `rotate(r)`, as it always was.
 */
function sheetTransform(layer: SheetLayer, rotation: number) {
  const [x, y] = [num(layer.x), num(layer.y)];
  const rotate = `rotate(${num(rotation)})`;
  return x === 0 && y === 0 ? rotate : `translate(${x} ${y}) ${rotate}`;
}

/** Characters safe in an id that a `url(#…)` reference also names. */
const idSafe = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, '');

export interface MarkShapesProps {
  emblem: EmblemModel;
  /** Current layer rotations; the static composition when omitted. */
  rotations?: readonly number[];
  idPrefix?: string;
}

/**
 * The emblem as an SVG group centred on (0, 0). Every sheet is its own
 * <rect>, turned with an SVG `rotate()` attribute (not CSS
 * transform-origin), which behaves identically in every browser.
 *
 * Fade gradients need ids that no other logo on the page shares: exports
 * use their `idPrefix`, and a live logo without one takes its own from
 * React, so each sheet's id only has to be unique within its logo.
 */
export function MarkShapes({ emblem, rotations, idPrefix }: MarkShapesProps) {
  const ownId = `lts${idSafe(useId())}`;
  const fades = emblem.layers.map((layer) => layer.fade && `${idPrefix ?? ownId}-fade-${layer.index}`);
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
          const fade = fades[i];
          return (
            <rect
              key={layer.id}
              id={shapeId(idPrefix, layer.id)}
              x={num(-layer.width / 2)}
              y={num(-layer.height / 2)}
              width={num(layer.width)}
              height={num(layer.height)}
              rx={num(layer.cornerRadius)}
              fill={fade ? `url(#${fade})` : layer.fill}
              opacity={num(layer.opacity)}
              style={layer.blendMode === 'normal' ? undefined : { mixBlendMode: layer.blendMode }}
              transform={sheetTransform(layer, rotations?.[i] ?? layer.rotation)}
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
   * room for every sheet at any angle, so animation never clips.
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
