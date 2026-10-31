import { standaloneSvg } from '../../shared/react/standaloneSvg';
import { boxSize, buildBubble, type Detail, type Theme } from '../engine';
import { BubbleSvg } from './BubbleSvg';

/**
 * The bubble emblem as a standalone SVG file, 240 × 240 like the reference,
 * at full detail unless `detail` asks for a smaller step, with ids taken
 * from its content (see `standaloneSvg`). `idPrefix` fixes the prefix
 * instead, for tests.
 */
export function renderBubbleSvg(
  theme: Theme,
  lettering: string,
  { detail = 'full', idPrefix }: { detail?: Detail; idPrefix?: string } = {},
) {
  const drawing = buildBubble({ theme, detail, lettering });
  // Full keeps its original kind, so its ids still change only when its drawing does.
  const kind = detail === 'full' ? `bubble/emblem-${theme}` : `bubble/emblem-${theme}-${detail}`;
  return standaloneSvg(kind, (prefix) => <BubbleSvg drawing={drawing} idPrefix={prefix} size={boxSize} />, idPrefix);
}

export const bubbleFileName = (theme: Theme) => `london-typescript-bubble-${theme}.svg`;
