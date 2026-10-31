import { palette } from '../../shared/palette';
import { slotRecipes, type Detail, type SlotId, type SlotRecipe, type Theme } from '../engine';
import { SlotSvg } from '../react/SlotSvg';
import type { KernedFont } from '../wordmark/fonts';

/** CSS widths each image is seen at, smallest first, and how the place shown crops its corners. */
const seen: Partial<Record<SlotId, { widths: number[]; radius: (width: number) => number }>> = {
  favicon: { widths: [16, 32], radius: () => 0 },
  // iOS's icon mask has corners about 22% of the side.
  appleTouchIcon: { widths: [40, 60], radius: (w) => w * 0.2237 },
  githubAvatar: { widths: [20, 32, 48, 100], radius: (w) => (w >= 48 ? 8 : 4) },
  readmeHeader: { widths: [290, 308], radius: () => 0 },
  meetupPhoto: { widths: [300, 600], radius: (w) => (w >= 600 ? 12 : 8) },
};

const themePage: Record<Theme, string> = { light: palette.white, dark: palette.darkPage };

/**
 * Every slot's image as its recipe composes it, at the sizes it is seen.
 * A transparent image is shown on the page its theme is for; an image with
 * its own background on the studio's neutral surround.
 */
export function SlotPreviews({ lettering, font }: { lettering: string; font: KernedFont }) {
  const images = slotRecipes.filter((r): r is SlotRecipe & { detail: Detail } => r.detail !== 'bySize');
  return (
    <div className="space-y-6">
      {images.map((recipe) => (
        <figure key={recipe.id} className="space-y-2">
          <figcaption className="text-sm">
            <span className="font-medium text-stone-800">{recipe.name}</span>
            <span className="text-stone-500">
              {' '}
              · {recipe.detail} · smallest {recipe.smallestDisplay.width} px ({recipe.smallestDisplay.source})
            </span>
          </figcaption>
          <div className="flex flex-wrap items-end gap-4">
            {recipe.themes.flatMap((theme) =>
              (seen[recipe.id]?.widths ?? []).map((width) => (
                <div
                  key={`${theme}-${width}`}
                  className="flex flex-col items-center gap-1 rounded-lg border border-stone-200 p-3"
                  style={{ backgroundColor: recipe.background.kind === 'transparent' ? themePage[theme] : undefined }}
                >
                  <div className="overflow-hidden" style={{ borderRadius: seen[recipe.id]?.radius(width) }}>
                    <SlotSvg
                      recipe={recipe}
                      theme={theme}
                      detail={recipe.detail}
                      lettering={lettering}
                      font={font}
                      width={width}
                      className="block"
                    />
                  </div>
                  <span className="font-mono text-[11px] text-stone-500">
                    {theme} · {width} px
                  </span>
                </div>
              )),
            )}
          </div>
        </figure>
      ))}
    </div>
  );
}
