import { slotRecipes, themes, type Detail, type SlotId, type SlotRecipe, type Theme } from '../engine';
import { bubbleFileName } from '../react/renderSvg';

/**
 * Every file `pnpm generate:assets` writes to `public/assets/`, and nothing
 * else: the slot recipes' images (what each shows is the recipe's, in
 * `engine/slots.ts`), plus the emblem and the wordmark alone as light and
 * dark pairs. Filenames, formats and where each file goes are decided here.
 */

/** A slot drawn into a file: the recipe's image, as SVG or as a PNG at its canvas size. */
interface SlotAsset {
  kind: 'slot';
  recipe: SlotRecipe & { detail: Detail };
}

/**
 * The full emblem alone, 240 wide and 253 tall so its ground fades out below
 * the sphere, the same bytes as the studio's download.
 */
interface EmblemAsset {
  kind: 'emblem';
}

/** The stacked wordmark alone, framed by its ink. */
interface WordmarkAsset {
  kind: 'wordmark';
}

type AssetSource = SlotAsset | EmblemAsset | WordmarkAsset;

export interface AssetEntry {
  file: string;
  format: 'svg' | 'png';
  source: AssetSource;
  theme: Theme;
  /** Where people put it. */
  usedFor: string;
}

/** Each slot's files: a name for each theme it is drawn in, and its formats. */
const slotFiles: Record<Exclude<SlotId, 'studio'>, { name: (theme: Theme) => string; usedFor: string }[]> = {
  favicon: [
    { name: () => 'london-typescript-favicon.svg', usedFor: 'Browser tabs, for browsers that take an SVG favicon' },
    { name: () => 'london-typescript-favicon-32.png', usedFor: 'Browser tabs, for browsers that need a PNG' },
  ],
  appleTouchIcon: [
    {
      name: () => 'london-typescript-apple-touch-icon.png',
      usedFor: 'A site saved to an iPhone or iPad home screen',
    },
  ],
  githubAvatar: [
    { name: () => 'london-typescript-github-avatar.png', usedFor: 'The londontypescript GitHub organisation’s avatar' },
  ],
  readmeHeader: [
    {
      name: (theme) => `london-typescript-logo-${theme}.svg`,
      usedFor: 'The logo at the top of a README, swapped by theme with <picture>; the full logo anywhere else',
    },
  ],
  meetupPhoto: [{ name: () => 'london-typescript-meetup-photo.png', usedFor: 'The Meetup group’s cover photo' }],
};

const slotEntries = slotRecipes.flatMap((recipe): AssetEntry[] => {
  if (recipe.id === 'studio' || recipe.detail === 'bySize') return [];
  const source: SlotAsset = { kind: 'slot', recipe: { ...recipe, detail: recipe.detail } };
  return slotFiles[recipe.id].flatMap(({ name, usedFor }) =>
    recipe.themes.map((theme) => {
      const file = name(theme);
      return { file, format: file.endsWith('.png') ? 'png' : 'svg', source, theme, usedFor };
    }),
  );
});

export const assetManifest: readonly AssetEntry[] = [
  ...themes.map((theme): AssetEntry => ({
    file: bubbleFileName(theme),
    format: 'svg',
    source: { kind: 'emblem' },
    theme,
    usedFor: 'The emblem on its own, wherever it is shown at 56 px or more',
  })),
  ...themes.map((theme): AssetEntry => ({
    file: `london-typescript-wordmark-${theme}.svg`,
    format: 'svg',
    source: { kind: 'wordmark' },
    theme,
    usedFor: 'The name on its own, where the emblem is already shown',
  })),
  ...slotEntries,
];
