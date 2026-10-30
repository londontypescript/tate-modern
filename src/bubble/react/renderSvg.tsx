import { standaloneSvg } from '../../shared/react/standaloneSvg';
import { boxSize, buildBubble, type Theme } from '../engine';
import { BubbleSvg } from './BubbleSvg';

/**
 * The bubble emblem as a standalone SVG file, full detail, 240 × 240 like
 * the reference, with ids taken from its content (see `standaloneSvg`).
 * `idPrefix` fixes the prefix instead, for tests.
 */
export function renderBubbleSvg(theme: Theme, lettering: string, options: { idPrefix?: string } = {}) {
  const drawing = buildBubble({ theme, detail: 'full', lettering });
  return standaloneSvg(
    `bubble/emblem-${theme}`,
    (idPrefix) => <BubbleSvg drawing={drawing} idPrefix={idPrefix} size={boxSize} />,
    options.idPrefix,
  );
}

export const bubbleFileName = (theme: Theme) => `london-typescript-bubble-${theme}.svg`;
