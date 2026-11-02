import { frameViewBox, num } from '../../shared/react/SvgFrame';
import { useOwnIdPrefix } from '../../shared/react/useOwnIdPrefix';
import { boxSize, buildBubble } from '../engine';
import { BubbleSvg } from '../react/BubbleSvg';
import { BandGradient } from '../react/SlotEdgesSvg';
import { BubbleLockupSvg } from '../wordmark/BubbleWordmark';
import { lockupBounds } from '../wordmark/lockup';
import type { BannerLayout } from './framing';

export interface BannerSvgProps {
  layout: BannerLayout;
  /** The tile's "TS" outline, from `tileLettering`. */
  lettering: string;
  /** Written as `width`; the height follows. Omitted, it fills its box. */
  width?: number;
  idPrefix?: string;
  className?: string;
}

/**
 * A banner as a self-contained SVG: the ground (Meetup framing only), the
 * band, then the lockup and the outlined text. Nothing in it needs a font,
 * and every id comes from one prefix, the emblem's nested under it, so two
 * banners on one page never paint with each other's gradients. The text
 * reaches the file only as outlines and as the accessible name, which React
 * escapes.
 */
export function BannerSvg({ layout, lettering, width, idPrefix, className }: BannerSvgProps) {
  const prefix = useOwnIdPrefix(idPrefix);
  const { canvas, content, band, ground, at, scale } = layout;
  const drawing = buildBubble({ theme: content.theme, detail: 'full', lettering });
  // The lockup's own frame rounds its viewBox outwards; the viewport holding it takes that same box, so the
  // lockup is never scaled a hair to fit. Its glow paints below the layout box, as the full bubble's does.
  const view = frameViewBox(lockupBounds(content.lockup, drawing.frame, boxSize));
  const bandId = `${prefix}-band`;
  const placed = `translate(${num(at.x)} ${num(at.y)})${scale === 1 ? '' : ` scale(${Number(scale.toFixed(6))})`}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width === undefined ? undefined : Number(((width * canvas.height) / canvas.width).toFixed(3))}
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
      role="img"
      aria-label={content.title}
      className={className}
    >
      <title>{content.title}</title>
      {band && (
        <defs>
          <BandGradient id={bandId} runs={band.runs} />
        </defs>
      )}
      {ground && <rect width={canvas.width} height={canvas.height} fill={ground} />}
      {band && <rect x={band.x} y={band.y} width={band.width} height={band.height} fill={`url(#${bandId})`} />}
      <g transform={placed}>
        <svg
          x={num(content.lockupAt.x + view.minX)}
          y={num(content.lockupAt.y + view.minY)}
          width={view.width}
          height={view.height}
          viewBox={`${view.minX} ${view.minY} ${view.width} ${view.height}`}
          overflow="hidden"
        >
          <BubbleLockupSvg
            lockup={content.lockup}
            emblem={{
              side: boxSize,
              content: <BubbleSvg drawing={drawing} size={boxSize} idPrefix={`${prefix}-emblem`} />,
              paintedBounds: drawing.frame,
            }}
            idPrefix={prefix}
          />
        </svg>
        {content.text && (
          <g id={`${prefix}-text`}>
            {content.text.shapes.map((shape) => (
              <path key={shape.id} id={`${prefix}-${shape.id}`} d={shape.d} fill={shape.fill} />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}
