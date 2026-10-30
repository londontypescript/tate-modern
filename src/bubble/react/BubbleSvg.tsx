import type { SVGAttributes } from 'react';
import { useOwnIdPrefix } from '../../shared/react/useOwnIdPrefix';
import {
  squareFrame,
  type BubbleDrawing,
  type Gradient,
  type Node,
  type Paint,
  type Paints,
  type Stop,
  type Transform,
} from '../engine';

/** Renders the drawing's paints as SVG attributes, its local ids resolved under `prefix`. */
function paintAttributes(paints: Paints, prefix: string): SVGAttributes<SVGElement> {
  const paint = (p: Paint | undefined) =>
    p === undefined || typeof p === 'string' ? p : `url(#${prefix}-${p.gradient})`;
  return {
    fill: paint(paints.fill),
    fillOpacity: paints.fillOpacity,
    stroke: paint(paints.stroke),
    strokeOpacity: paints.strokeOpacity,
    strokeWidth: paints.strokeWidth,
    filter: paints.filter === undefined ? undefined : `url(#${prefix}-${paints.filter})`,
    transform: paints.transform && transformAttribute(paints.transform),
  };
}

const transformAttribute = (t: Transform) =>
  'rotate' in t
    ? `rotate(${t.rotate} ${t.cx} ${t.cy})`
    : `translate(${t.cx} ${t.cy}) scale(${t.scale}) translate(${-t.cx} ${-t.cy})`;

const stops = (list: Stop[]) =>
  list.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.colour} stopOpacity={s.opacity} />);

function GradientDef({ gradient, prefix }: { gradient: Gradient; prefix: string }) {
  const id = `${prefix}-${gradient.id}`;
  return gradient.kind === 'linear' ? (
    <linearGradient id={id} x1={gradient.x1} y1={gradient.y1} x2={gradient.x2} y2={gradient.y2}>
      {stops(gradient.stops)}
    </linearGradient>
  ) : (
    <radialGradient id={id} cx={gradient.cx} cy={gradient.cy} r={gradient.r}>
      {stops(gradient.stops)}
    </radialGradient>
  );
}

function NodeSvg({ node, prefix }: { node: Node; prefix: string }) {
  const paints = paintAttributes(node, prefix);
  switch (node.kind) {
    case 'group':
      return (
        <g {...paints} clipPath={node.clip === undefined ? undefined : `url(#${prefix}-${node.clip})`}>
          {node.children.map((child, i) => (
            <NodeSvg key={i} node={child} prefix={prefix} />
          ))}
        </g>
      );
    case 'circle':
      return <circle cx={node.cx} cy={node.cy} r={node.r} {...paints} />;
    case 'ellipse':
      return <ellipse cx={node.cx} cy={node.cy} rx={node.rx} ry={node.ry} {...paints} />;
    case 'rect':
      return <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={node.rx} {...paints} />;
    case 'path':
      return <path d={node.d} {...paints} />;
  }
}

export interface BubbleSvgProps {
  drawing: BubbleDrawing;
  /** Fixes the ids' prefix (exports); a live drawing without one takes its own. */
  idPrefix?: string;
  /** Written as `width` and `height`, so a file shows at its size as an `<img>`; omitted, it fills its box. */
  size?: number;
  className?: string;
}

/**
 * The bubble as a self-contained SVG: its square frame, every gradient, blur
 * and clip defined inside it under one prefix, and only concrete values (no
 * CSS, no custom properties, no outside references).
 */
export function BubbleSvg({ drawing, idPrefix, size, className }: BubbleSvgProps) {
  const prefix = useOwnIdPrefix(idPrefix);
  const { minX, minY, maxX, maxY } = squareFrame;
  const { gradients, blurs, clips } = drawing.defs;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      role="img"
      aria-label={drawing.title}
      className={className}
    >
      <title>{drawing.title}</title>
      <defs>
        {gradients.map((g) => (
          <GradientDef key={g.id} gradient={g} prefix={prefix} />
        ))}
        {blurs.map((b) => (
          <filter
            key={b.id}
            id={`${prefix}-${b.id}`}
            x={`${b.region.x * 100}%`}
            y={`${b.region.y * 100}%`}
            width={`${b.region.width * 100}%`}
            height={`${b.region.height * 100}%`}
          >
            <feGaussianBlur stdDeviation={b.stdDeviation} />
          </filter>
        ))}
        {clips.map((c) => (
          <clipPath key={c.id} id={`${prefix}-${c.id}`}>
            <circle cx={c.cx} cy={c.cy} r={c.r} />
          </clipPath>
        ))}
      </defs>
      {drawing.layers.map((layer) => (
        <NodeSvg key={layer.name} node={layer} prefix={prefix} />
      ))}
    </svg>
  );
}
