import { useOwnIdPrefix } from '../../shared/react/useOwnIdPrefix';
import { unionBox } from '../../shared/typography';
import { boxSize, buildBubble, type Detail, type SlotRecipe, type Theme } from '../engine';
import { BubbleLockupSvg } from '../wordmark/BubbleWordmark';
import type { KernedFont } from '../wordmark/fonts';
import { layoutBubbleLockup } from '../wordmark/lockup';
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

/**
 * The image's own size in its units: the recipe's canvas, or for a drawing
 * framed by its content (the README header), the lockup's box. Exports write
 * it as their pixel size.
 */
export function slotCanvas(recipe: SlotRecipe, theme: Theme, font?: KernedFont) {
  if (recipe.canvas) return recipe.canvas;
  if (recipe.composition === 'emblem') return { width: recipe.emblemSide, height: recipe.emblemSide };
  if (!font) throw new Error(`The ${recipe.id} slot's lockup needs the wordmark's font`);
  const lockup = layoutBubbleLockup(font, { emblemSize: recipe.emblemSide, theme });
  const bounds = unionBox(lockup.box, lockup.wordmarkInk);
  return { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
}

/**
 * One slot's image as its recipe composes it: the fixed background, then
 * the emblem or the lockup centred on the canvas. The lockup's emblem is
 * framed by its square, so the full bubble's shadow is clipped there, as
 * the reference clips it. Every id comes from one prefix, the emblem's
 * nested under it.
 */
export function SlotSvg({ recipe, theme, detail, lettering, font, width, idPrefix, className }: SlotSvgProps) {
  const prefix = useOwnIdPrefix(idPrefix);
  const drawing = buildBubble({ theme, detail, lettering });
  const emblem = <BubbleSvg drawing={drawing} size={boxSize} idPrefix={`${prefix}-emblem`} />;
  const side = recipe.emblemSide;

  let content;
  let box: { width: number; height: number };
  if (recipe.composition === 'emblem') {
    box = { width: side, height: side };
    content = <g transform={`scale(${side / boxSize})`}>{emblem}</g>;
  } else {
    if (!font) throw new Error(`The ${recipe.id} slot's lockup needs the wordmark's font`);
    const lockup = layoutBubbleLockup(font, { emblemSize: side, theme });
    const bounds = unionBox(lockup.box, lockup.wordmarkInk);
    box = { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
    content = (
      <svg
        viewBox={`${bounds.minX} ${bounds.minY} ${box.width} ${box.height}`}
        width={box.width}
        height={box.height}
        overflow="hidden"
      >
        <BubbleLockupSvg lockup={lockup} emblem={{ side: boxSize, content: emblem }} idPrefix={prefix} />
      </svg>
    );
  }

  const canvas = recipe.canvas ?? box;
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
      <g transform={`translate(${(canvas.width - box.width) / 2} ${(canvas.height - box.height) / 2})`}>{content}</g>
    </svg>
  );
}
