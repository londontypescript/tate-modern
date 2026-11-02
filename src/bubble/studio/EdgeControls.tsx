import { bandChoices, cornerChoices, type Detail, type SlotEdges, type SlotRecipe } from '../engine';
import { renderSlotSvg } from '../react/renderSlot';
import { slotCanvas } from '../react/SlotSvg';
import type { KernedFont } from '../wordmark/fonts';
import { Choices } from './Choices';
import { Downloads } from './Downloads';
import { slotFileName } from './slotDownload';

const labels: Record<SlotEdges['band'] | SlotEdges['corners'], string> = {
  off: 'Off',
  on: 'On',
  left: 'Left',
  right: 'Right',
  top: 'Top',
  bottom: 'Bottom',
};

interface Props {
  recipe: SlotRecipe & { detail: Detail };
  edges: SlotEdges;
  onEdges: (edges: SlotEdges) => void;
  lettering: string;
  font: KernedFont;
}

/**
 * The band and corner toggles for an image that offers them, and its
 * downloads: the SVG, and a PNG the browser draws from that same SVG at the
 * image's own size. Both follow the toggles, as the preview does.
 */
export function EdgeControls({ recipe, edges, onEdges, lettering, font }: Props) {
  // An image with edges has a fixed background, so it is drawn in one theme only.
  const theme = recipe.themes[0] ?? 'dark';
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2" data-edge-controls>
      <Choices
        name="Band"
        choices={bandChoices}
        labels={labels}
        value={edges.band}
        onChoose={(band) => onEdges({ ...edges, band })}
      />
      <Choices
        name="Rounded corners"
        choices={cornerChoices}
        labels={labels}
        value={edges.corners}
        onChoose={(corners) => onEdges({ ...edges, corners })}
      />
      <Downloads
        svg={() => renderSlotSvg(recipe, theme, { lettering, font }, edges)}
        size={slotCanvas(recipe, theme, recipe.detail, font)}
        fileName={(format) => slotFileName(recipe, edges, format)}
      />
    </div>
  );
}
