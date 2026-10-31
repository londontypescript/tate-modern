import { useState } from 'react';
import { bandChoices, cornerChoices, type Detail, type SlotEdges, type SlotRecipe } from '../engine';
import { renderSlotSvg } from '../react/renderSlot';
import { slotCanvas } from '../react/SlotSvg';
import type { KernedFont } from '../wordmark/fonts';
import { downloadSvg } from './download';
import { downloadBlob, slotFileName, svgToPng } from './slotDownload';

const labels: Record<SlotEdges['band'] | SlotEdges['corners'], string> = {
  off: 'Off',
  on: 'On',
  left: 'Left',
  right: 'Right',
  top: 'Top',
  bottom: 'Bottom',
};

const button = 'rounded-md border px-2.5 py-1 text-sm font-medium';
const choiceClass = (pressed: boolean) =>
  `${button} ${pressed ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'}`;

function Choices<T extends keyof typeof labels>({
  name,
  choices,
  value,
  onChoose,
}: {
  name: string;
  choices: readonly T[];
  value: T;
  onChoose: (choice: T) => void;
}) {
  return (
    <div role="group" aria-label={name} className="flex items-center gap-1.5">
      <span className="mr-1 text-sm text-stone-600">{name}</span>
      {choices.map((choice) => (
        <button
          key={choice}
          type="button"
          aria-pressed={choice === value}
          onClick={() => onChoose(choice)}
          className={choiceClass(choice === value)}
        >
          {labels[choice]}
        </button>
      ))}
    </div>
  );
}

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
  const [failure, setFailure] = useState<string>();
  // The browser can take several seconds over the first PNG, so the button says it is working.
  const [making, setMaking] = useState(false);
  // An image with edges has a fixed background, so it is drawn in one theme only.
  const theme = recipe.themes[0] ?? 'dark';
  const svg = () => renderSlotSvg(recipe, theme, { lettering, font }, edges);
  const savePng = () => {
    setFailure(undefined);
    setMaking(true);
    svgToPng(svg(), slotCanvas(recipe, theme, recipe.detail, font))
      .then((png) => downloadBlob(slotFileName(recipe, edges, 'png'), png))
      .catch((error: unknown) => setFailure(error instanceof Error ? error.message : String(error)))
      .finally(() => setMaking(false));
  };
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2" data-edge-controls>
      <Choices name="Band" choices={bandChoices} value={edges.band} onChoose={(band) => onEdges({ ...edges, band })} />
      <Choices
        name="Rounded corners"
        choices={cornerChoices}
        value={edges.corners}
        onChoose={(corners) => onEdges({ ...edges, corners })}
      />
      <div className="flex items-center gap-1.5">
        <span className="mr-1 text-sm text-stone-600">Download</span>
        <button
          type="button"
          onClick={() => downloadSvg(slotFileName(recipe, edges, 'svg'), svg())}
          className={choiceClass(false)}
        >
          SVG
        </button>
        <button type="button" onClick={savePng} disabled={making} className={choiceClass(false)}>
          {making ? 'Making the PNG…' : 'PNG'}
        </button>
      </div>
      {failure && (
        <p role="alert" className="text-sm text-red-700">
          The PNG could not be made: {failure}
        </p>
      )}
    </div>
  );
}
