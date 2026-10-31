import { useState } from 'react';
import { plainEdges, slotRecipes, type Detail, type SlotEdges, type SlotId, type SlotRecipe } from '../engine';
import { SlotSvg } from '../react/SlotSvg';
import type { KernedFont } from '../wordmark/fonts';
import { EdgeControls } from './EdgeControls';
import { captionClass, homeGround } from './grounds';
import { themeLabels } from './TopicLayout';

/**
 * CSS widths each image is seen at, smallest first, how the place shown
 * crops its corners, and, for an image previewed unmasked, the place's name.
 */
const seen: Partial<Record<SlotId, { widths: number[]; radius: (width: number) => number; place?: string }>> = {
  favicon: { widths: [16, 32], radius: () => 0 },
  // iOS's icon mask has corners about 22% of the side.
  appleTouchIcon: { widths: [40, 60], radius: (w) => w * 0.2237 },
  githubAvatar: { widths: [20, 32, 48, 100], radius: (w) => (w >= 48 ? 8 : 4) },
  readmeHeader: { widths: [290, 308], radius: () => 0 },
  meetupPhoto: { widths: [300, 600], radius: (w) => (w >= 600 ? 12 : 8), place: 'Meetup' },
};

type ImageRecipe = SlotRecipe & { detail: Detail };

/**
 * Every slot's image, one row per slot, as its recipe composes it at the
 * sizes it is seen. A transparent image sits on its theme's own page, light
 * and dark together where it comes as a pair; an image with a fixed
 * background brings it, shown once, on the studio's neutral surround.
 */
export function SlotPreviews({ lettering, font }: { lettering: string; font: KernedFont }) {
  const [edges, setEdges] = useState<SlotEdges>(plainEdges);
  const images = slotRecipes.filter((r): r is ImageRecipe => r.detail !== 'bySize');
  return (
    <div className="space-y-8">
      {images.map((recipe) => (
        <SlotFigure
          key={recipe.id}
          recipe={recipe}
          lettering={lettering}
          font={font}
          edges={recipe.edges ? edges : plainEdges}
          onEdges={setEdges}
        />
      ))}
    </div>
  );
}

interface FigureProps {
  recipe: ImageRecipe;
  lettering: string;
  font: KernedFont;
  /** The band and corners drawn, for an image that offers them. */
  edges: SlotEdges;
  onEdges: (edges: SlotEdges) => void;
}

/**
 * One slot's row. An image that offers a band and rounded corners shows
 * their toggles, and is previewed as the file itself, unmasked, so square
 * corners show as square; the place's own crop is simulated in a card of
 * its own, labelled as such. Other images are previewed as their place crops them.
 */
export function SlotFigure({ recipe, lettering, font, edges, onEdges }: FigureProps) {
  const fixed = recipe.background.kind === 'fixed';
  const sizes = seen[recipe.id];
  const widths = sizes?.widths ?? [];
  const unmasked = recipe.edges !== undefined;
  // Each card: its width, the crop the CSS simulates, and whether that crop is the place's rather than the file's.
  const cards = unmasked
    ? [
        ...widths.map((width) => ({ width, radius: 0, simulated: false })),
        ...widths.slice(-1).map((width) => ({ width, radius: sizes?.radius(width) ?? 0, simulated: true })),
      ]
    : widths.map((width) => ({ width, radius: sizes?.radius(width) ?? 0, simulated: false }));
  return (
    <figure data-slot={recipe.id} className="space-y-2">
      <figcaption className="text-sm">
        <span className="font-medium text-stone-800">{recipe.name}</span>
        <span className="text-stone-500">
          {' '}
          · {recipe.detail} · smallest {recipe.smallestDisplay.width} px ({recipe.smallestDisplay.source})
        </span>
      </figcaption>
      {unmasked && <EdgeControls recipe={recipe} edges={edges} onEdges={onEdges} lettering={lettering} font={font} />}
      <div className="flex flex-wrap gap-4">
        {recipe.themes.map((theme) => {
          const ground = fixed ? undefined : homeGround[theme];
          // Each size in its own card, so a tightly framed image (the README header) doesn't run into the next.
          const card = ground === homeGround.dark ? 'border-stone-700' : 'border-stone-200';
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
              <div className="flex w-max items-end gap-6">
                {cards.map(({ width, radius, simulated }) => (
                  <div
                    key={`${width}${simulated ? '-crop' : ''}`}
                    data-crop={simulated ? 'simulated' : unmasked ? 'none' : undefined}
                    className={`flex flex-col items-center gap-2 rounded-md border p-3 ${card}`}
                  >
                    <div className="overflow-hidden" style={{ borderRadius: radius }}>
                      <SlotSvg
                        recipe={recipe}
                        theme={theme}
                        detail={recipe.detail}
                        lettering={lettering}
                        font={font}
                        edges={edges}
                        width={width}
                        className="block"
                      />
                    </div>
                    <span className={captionClass(ground ?? homeGround.light)}>
                      {width} px
                      {simulated
                        ? `, as ${sizes?.place ?? 'its place'} crops it (simulated, ${radius} px corners)`
                        : unmasked
                          ? ', the file itself'
                          : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
