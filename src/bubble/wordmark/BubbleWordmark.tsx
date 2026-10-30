import type { ReactNode } from 'react';
import { SvgFrame, num, shapeId, type SvgFrameProps } from '../../shared/react/SvgFrame';
import type { Box } from '../../shared/types';
import { unionBox } from '../../shared/typography';
import type { BubbleLockup } from './lockup';
import type { BubbleWordmark } from './wordmark';

/** The outlined wordmark in wordmark space (first line box at the origin). */
function BubbleWordmarkShapes({ wordmark, idPrefix }: { wordmark: BubbleWordmark; idPrefix?: string }) {
  return (
    <g id={shapeId(idPrefix, 'wordmark')}>
      {wordmark.shapes.map((shape) => (
        <path key={shape.id} id={shapeId(idPrefix, shape.id)} d={shape.d} fill={shape.fill} />
      ))}
    </g>
  );
}

/** The wordmark alone, framed by its ink. */
export function BubbleWordmarkSvg({
  wordmark,
  title = 'London TypeScript',
  idPrefix,
  ...frame
}: SvgFrameProps & { wordmark: BubbleWordmark }) {
  return (
    <SvgFrame bounds={wordmark.inkBounds} title={title} {...frame}>
      <BubbleWordmarkShapes wordmark={wordmark} idPrefix={idPrefix} />
    </SvgFrame>
  );
}

/** An emblem as the lockup receives it: drawn in its own square. */
export interface LockupEmblem {
  /** The emblem's drawing, in a square from (0, 0) to (`side`, `side`). */
  content: ReactNode;
  side: number;
  /**
   * Where it paints, in the same units, when that passes its square (a
   * blurred shadow), so the frame doesn't crop it. Defaults to the square.
   */
  paintedBounds?: Box;
}

/** The emblem and the wordmark beside it, framed to show both whole. */
export function BubbleLockupSvg({
  lockup,
  emblem,
  title = 'London TypeScript',
  idPrefix,
  ...frame
}: SvgFrameProps & { lockup: BubbleLockup; emblem: LockupEmblem }) {
  const k = lockup.emblem.size / emblem.side;
  const painted = emblem.paintedBounds ?? { minX: 0, minY: 0, maxX: emblem.side, maxY: emblem.side };
  const emblemBounds = {
    minX: lockup.emblem.x + painted.minX * k,
    minY: lockup.emblem.y + painted.minY * k,
    maxX: lockup.emblem.x + painted.maxX * k,
    maxY: lockup.emblem.y + painted.maxY * k,
  };
  const bounds = unionBox(unionBox(lockup.box, lockup.wordmarkInk), emblemBounds);
  return (
    <SvgFrame bounds={bounds} title={title} {...frame}>
      <g
        id={shapeId(idPrefix, 'emblem')}
        transform={`translate(${num(lockup.emblem.x)} ${num(lockup.emblem.y)}) scale(${Number(k.toFixed(6))})`}
      >
        {emblem.content}
      </g>
      <g transform={`translate(${num(lockup.offset.x)} ${num(lockup.offset.y)})`}>
        <BubbleWordmarkShapes wordmark={lockup.wordmark} idPrefix={idPrefix} />
      </g>
    </SvgFrame>
  );
}
