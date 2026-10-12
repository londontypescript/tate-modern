import type { ReactNode } from 'react';
import type { Box } from '..';

/** Rounds for attribute output; geometry stays full precision. */
export const num = (v: number) => Number(v.toFixed(3));

/** The element id for a shape, prefixed so several logos can share a page. */
export const shapeId = (prefix: string | undefined, id: string) => (prefix ? `${prefix}-${id}` : undefined);

/** Props shared by every standalone logo component. */
export interface SvgFrameProps {
  /** Accessible name, also written as the SVG <title>. */
  title?: string;
  /** Fill behind the artwork; transparent when omitted. */
  background?: string;
  /** Adds `id` attributes (`<prefix>-layer-0`, …) to the shapes. */
  idPrefix?: string;
  className?: string;
}

/**
 * Root <svg> sized purely by its viewBox, so it scales to its container and
 * keeps its aspect ratio. The viewBox is rounded outwards to avoid clipping.
 */
export function SvgFrame({
  bounds,
  title,
  background,
  className,
  children,
}: SvgFrameProps & { bounds: Box; children: ReactNode }) {
  const minX = Math.floor(bounds.minX * 100) / 100;
  const minY = Math.floor(bounds.minY * 100) / 100;
  const width = num(Math.ceil(bounds.maxX * 100) / 100 - minX);
  const height = num(Math.ceil(bounds.maxY * 100) / 100 - minY);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${minX} ${minY} ${width} ${height}`}
      role="img"
      aria-label={title}
      className={className}
    >
      {title && <title>{title}</title>}
      {background && <rect x={minX} y={minY} width={width} height={height} fill={background} />}
      {children}
    </svg>
  );
}
