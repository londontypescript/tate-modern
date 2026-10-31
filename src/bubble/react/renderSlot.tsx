import { standaloneSvg } from '../../shared/react/standaloneSvg';
import { isPlain, type Detail, type SlotEdges, type SlotRecipe, type Theme } from '../engine';
import type { KernedFont } from '../wordmark/fonts';
import { SlotSvg, slotCanvas } from './SlotSvg';

/**
 * A slot's image as a standalone SVG file, written at its pixel size, with
 * ids taken from its content (see `standaloneSvg`). Plain edges give the
 * committed asset's own source byte for byte; the studio's download passes
 * the band and corners chosen.
 */
export function renderSlotSvg(
  recipe: SlotRecipe & { detail: Detail },
  theme: Theme,
  { lettering, font }: { lettering: string; font: KernedFont },
  edges?: SlotEdges,
) {
  const canvas = slotCanvas(recipe, theme, recipe.detail, font);
  const kind = `bubble/${recipe.id}-${theme}${edges && !isPlain(edges) ? edgeSuffix(edges) : ''}`;
  return standaloneSvg(kind, (prefix) => (
    <SlotSvg
      recipe={recipe}
      theme={theme}
      detail={recipe.detail}
      lettering={lettering}
      font={font}
      edges={edges}
      width={Number(canvas.width.toFixed(3))}
      idPrefix={prefix}
    />
  ));
}

/** What a file name adds for the band and corners: nothing when plain. */
export const edgeSuffix = ({ band, corners }: SlotEdges) =>
  `${band === 'off' ? '' : `-band-${band}`}${corners === 'on' ? '-rounded' : ''}`;
