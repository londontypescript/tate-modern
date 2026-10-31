import { slotRecipes, type Detail, type SlotId, type SlotRecipe, type Theme } from '../engine';
import { SlotSvg } from '../react/SlotSvg';
import type { KernedFont } from '../wordmark/fonts';
import { borderClass, captionClass, noteClass, strongClass } from './grounds';

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
 * Every slot made in this theme, as its recipe composes it, at the sizes it
 * is seen, on the panel of the theme's own page. A transparent image sits on
 * that page; an image with its own background brings it, and the card's
 * hairline shows where it is cropped.
 */
export function SlotPreviews({
  theme,
  ground,
  lettering,
  font,
}: {
  theme: Theme;
  /** The panel's colour, which the captions must stay readable on. */
  ground: string;
  lettering: string;
  font: KernedFont;
}) {
  const images = slotRecipes.filter(
    (r): r is SlotRecipe & { detail: Detail } => r.detail !== 'bySize' && r.themes.includes(theme),
  );
  return (
    <div className="space-y-6">
      {images.map((recipe) => (
        <figure key={recipe.id} className="space-y-2">
          <figcaption className={noteClass(ground)}>
            <span className={strongClass(ground)}>{recipe.name}</span> · {recipe.detail} · smallest{' '}
            {recipe.smallestDisplay.width} px ({recipe.smallestDisplay.source})
          </figcaption>
          <div className="flex w-max items-end gap-4">
            {(seen[recipe.id]?.widths ?? []).map((width) => (
              <div
                key={width}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 ${borderClass(ground)}`}
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
                <span className={captionClass(ground)}>{width} px</span>
              </div>
            ))}
          </div>
        </figure>
      ))}
    </div>
  );
}
