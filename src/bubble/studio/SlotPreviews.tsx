import { slotRecipes, type Detail, type SlotId, type SlotRecipe } from '../engine';
import { SlotSvg } from '../react/SlotSvg';
import type { KernedFont } from '../wordmark/fonts';
import { captionClass, homeGround } from './grounds';
import { themeLabels } from './TopicLayout';

/** CSS widths each image is seen at, smallest first, and how the place shown crops its corners. */
const seen: Partial<Record<SlotId, { widths: number[]; radius: (width: number) => number }>> = {
  favicon: { widths: [16, 32], radius: () => 0 },
  // iOS's icon mask has corners about 22% of the side.
  appleTouchIcon: { widths: [40, 60], radius: (w) => w * 0.2237 },
  githubAvatar: { widths: [20, 32, 48, 100], radius: (w) => (w >= 48 ? 8 : 4) },
  readmeHeader: { widths: [290, 308], radius: () => 0 },
  meetupPhoto: { widths: [300, 600], radius: (w) => (w >= 600 ? 12 : 8) },
};

/**
 * Every slot's image, one row per slot, as its recipe composes it at the
 * sizes it is seen. A transparent image sits on its theme's own page, light
 * and dark side by side where it comes as a pair; an image with a fixed
 * background brings it, shown once, on the studio's neutral surround.
 */
export function SlotPreviews({ lettering, font }: { lettering: string; font: KernedFont }) {
  const images = slotRecipes.filter((r): r is SlotRecipe & { detail: Detail } => r.detail !== 'bySize');
  return (
    <div className="space-y-8">
      {images.map((recipe) => {
        const fixed = recipe.background.kind === 'fixed';
        return (
          <figure key={recipe.id} data-slot={recipe.id} className="space-y-2">
            <figcaption className="text-sm">
              <span className="font-medium text-stone-800">{recipe.name}</span>
              <span className="text-stone-500">
                {' '}
                · {recipe.detail} · smallest {recipe.smallestDisplay.width} px ({recipe.smallestDisplay.source})
              </span>
            </figcaption>
            <div className="flex flex-wrap gap-4">
              {recipe.themes.map((theme) => {
                const ground = fixed ? undefined : homeGround[theme];
                const label = fixed
                  ? `${themeLabels[theme]}, on its fixed GitHub-dark background`
                  : `${themeLabels[theme]}, on the ${theme} page`;
                return (
                  <div
                    key={theme}
                    data-theme={theme}
                    className="min-w-0 max-w-full space-y-1.5 overflow-x-auto rounded-lg border border-stone-200 p-3"
                    style={{ backgroundColor: ground }}
                  >
                    <div className={captionClass(ground ?? homeGround.light)}>{label}</div>
                    <div className="flex w-max items-end gap-4">
                      {(seen[recipe.id]?.widths ?? []).map((width) => (
                        <div key={width} className="flex flex-col items-center gap-1">
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
                          <span className={captionClass(ground ?? homeGround.light)}>{width} px</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </figure>
        );
      })}
    </div>
  );
}
