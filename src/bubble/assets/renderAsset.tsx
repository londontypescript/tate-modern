import { standaloneSvg } from '../../shared/react/standaloneSvg';
import { slotRecipes } from '../engine';
import { renderBubbleSvg } from '../react/renderSvg';
import { SlotSvg, slotCanvas } from '../react/SlotSvg';
import { BubbleWordmarkSvg } from '../wordmark/BubbleWordmark';
import type { KernedFont } from '../wordmark/fonts';
import { layoutBubbleLockup } from '../wordmark/lockup';
import type { AssetEntry } from './manifest';

export interface AssetInputs {
  /** The tile's "TS" outline, from `tileLettering`. */
  lettering: string;
  /** Exo 2 Bold, for the wordmark and lockups. */
  font: KernedFont;
}

/**
 * The standalone SVG an asset is made from: the file itself for an SVG, and
 * what resvg rasterises for a PNG. Each carries its pixel size as `width`
 * and `height`, so it shows at that size in an `<img>` with none given.
 */
export function renderAssetSvg(entry: AssetEntry, { lettering, font }: AssetInputs): string {
  const { source, theme } = entry;
  switch (source.kind) {
    case 'emblem':
      return renderBubbleSvg(theme, lettering);
    case 'wordmark': {
      // At the size the README header's lockup sets it, so the two read alike side by side.
      const readmeEmblem = slotRecipes.find((r) => r.id === 'readmeHeader')?.emblemSide;
      if (readmeEmblem === undefined) throw new Error('The wordmark is sized from the README header’s recipe');
      const { wordmark } = layoutBubbleLockup(font, { emblemSize: readmeEmblem, theme });
      const ink = wordmark.inkBounds;
      const width = Number((ink.maxX - ink.minX).toFixed(3));
      const height = Number((ink.maxY - ink.minY).toFixed(3));
      return standaloneSvg(`bubble/wordmark-${theme}`, (prefix) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <BubbleWordmarkSvg wordmark={wordmark} idPrefix={prefix} />
        </svg>
      ));
    }
    case 'slot': {
      const { recipe } = source;
      const canvas = slotCanvas(recipe, theme, font);
      return standaloneSvg(`bubble/${recipe.id}-${theme}`, (prefix) => (
        <SlotSvg
          recipe={recipe}
          theme={theme}
          detail={recipe.detail}
          lettering={lettering}
          font={font}
          width={Number(canvas.width.toFixed(3))}
          idPrefix={prefix}
        />
      ));
    }
  }
}

/** A PNG's pixel size: its recipe's canvas. Only slot images are rasterised. */
export function pngSize(entry: AssetEntry) {
  if (entry.source.kind !== 'slot' || !entry.source.recipe.canvas) {
    throw new Error(`${entry.file}: only a slot image with a canvas is written as PNG`);
  }
  return entry.source.recipe.canvas;
}
