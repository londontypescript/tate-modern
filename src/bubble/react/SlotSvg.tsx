import { frameViewBox, num } from '../../shared/react/SvgFrame';
import { useOwnIdPrefix } from '../../shared/react/useOwnIdPrefix';
import type { Box } from '../../shared/types';
import { unionBox } from '../../shared/typography';
import { boxSize, buildBubble, stepBounds, type Detail, type SlotRecipe, type Theme } from '../engine';
import { BubbleLockupSvg } from '../wordmark/BubbleWordmark';
import type { KernedFont } from '../wordmark/fonts';
import { layoutBubbleLockup, lockupBounds, type BubbleLockup } from '../wordmark/lockup';
import { BubbleSvg } from './BubbleSvg';

export interface SlotSvgProps {
  recipe: SlotRecipe;
  theme: Theme;
  /** The step to draw: the recipe's own, or the one its display size chooses. */
  detail: Detail;
  lettering: string;
  /** The wordmark's font, for a lockup. */
  font?: KernedFont;
  /** Written as `width`; the height follows. Omitted, it fills its box. */
  width?: number;
  idPrefix?: string;
  className?: string;
}

/** A slot's content in its own units: the box it is placed by, and the box it shows. */
interface SlotContent {
  /** The emblem's square, or the lockup's layout: what a canvas centres, whatever the emblem's frame. */
  layout: Box;
  /** Everything shown: the layout and, below it, the room the full bubble's frame adds. */
  shown: Box;
  lockup?: BubbleLockup;
}

function slotContent(recipe: SlotRecipe, theme: Theme, detail: Detail, font?: KernedFont): SlotContent {
  const { frame } = stepBounds(detail, theme);
  const side = recipe.emblemSide;
  if (recipe.composition === 'emblem') {
    const k = side / boxSize;
    const layout = { minX: 0, minY: 0, maxX: side, maxY: side };
    return { layout, shown: unionBox(layout, scaleBox(frame, k)) };
  }
  if (!font) throw new Error(`The ${recipe.id} slot's lockup needs the wordmark's font`);
  const lockup = layoutBubbleLockup(font, { emblemSize: side, theme });
  // The lockup's own frame rounds its viewBox outwards; the viewport holding it takes the same box, so the
  // lockup is never scaled a hair to fit, which would shift the wordmark by a fraction of a pixel.
  const view = frameViewBox(lockupBounds(lockup, frame, boxSize));
  return {
    layout: unionBox(lockup.box, lockup.wordmarkInk),
    shown: { minX: view.minX, minY: view.minY, maxX: view.minX + view.width, maxY: view.minY + view.height },
    lockup,
  };
}

const scaleBox = (b: Box, k: number): Box => ({
  minX: b.minX * k,
  minY: b.minY * k,
  maxX: b.maxX * k,
  maxY: b.maxY * k,
});
const sizeOf = (b: Box) => ({ width: b.maxX - b.minX, height: b.maxY - b.minY });
/** What a viewport or canvas writes: rounded as `frameViewBox` rounds, so no floating-point noise. */
const shownSize = (b: Box) => ({ width: num(b.maxX - b.minX), height: num(b.maxY - b.minY) });

/**
 * The image's own size in its units: the recipe's canvas, or for a drawing
 * framed by its content (the README header), all the content shows, the
 * full bubble's ground included. Exports write it as their pixel size.
 */
export function slotCanvas(recipe: SlotRecipe, theme: Theme, detail: Detail, font?: KernedFont) {
  return recipe.canvas ?? shownSize(slotContent(recipe, theme, detail, font).shown);
}

/**
 * One slot's image as its recipe composes it: the fixed background, then
 * the emblem or the lockup. On a canvas, the content is centred by its
 * layout box, the emblem's square, so the full bubble's taller frame leaves
 * the logo where it was and its ground hangs below; without one, the image
 * is framed by everything the content shows. Every id comes from one
 * prefix, the emblem's nested under it.
 */
export function SlotSvg({ recipe, theme, detail, lettering, font, width, idPrefix, className }: SlotSvgProps) {
  const prefix = useOwnIdPrefix(idPrefix);
  const drawing = buildBubble({ theme, detail, lettering });
  const emblem = <BubbleSvg drawing={drawing} size={boxSize} idPrefix={`${prefix}-emblem`} />;
  const { layout, shown, lockup } = slotContent(recipe, theme, detail, font);
  const box = shownSize(shown);

  const content = lockup ? (
    <svg
      viewBox={`${shown.minX} ${shown.minY} ${box.width} ${box.height}`}
      width={box.width}
      height={box.height}
      overflow="hidden"
    >
      <BubbleLockupSvg
        lockup={lockup}
        emblem={{ side: boxSize, content: emblem, paintedBounds: drawing.frame }}
        idPrefix={prefix}
      />
    </svg>
  ) : (
    <g transform={`scale(${recipe.emblemSide / boxSize})`}>{emblem}</g>
  );

  const canvas = recipe.canvas ?? box;
  // Where the shown box's top left lands: the layout centred on a canvas, or the image's own corner.
  const at = recipe.canvas
    ? {
        x: (canvas.width - sizeOf(layout).width) / 2 + shown.minX - layout.minX,
        y: (canvas.height - sizeOf(layout).height) / 2 + shown.minY - layout.minY,
      }
    : { x: 0, y: 0 };
  const title = recipe.composition === 'emblem' ? drawing.title : `London TypeScript logo, ${theme} theme`;
  const background = recipe.background.kind === 'fixed' ? recipe.background.colour : undefined;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width === undefined ? undefined : Number(((width * canvas.height) / canvas.width).toFixed(3))}
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      {background && <rect width={canvas.width} height={canvas.height} fill={background} />}
      <g transform={`translate(${at.x} ${at.y})`}>{content}</g>
    </svg>
  );
}
