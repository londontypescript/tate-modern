import { palette } from '../../shared/palette';
import type { Box } from '../../shared/types';
import type { Detail } from './detail';
import type { Theme } from './types';

/**
 * Where the logo lands, and how each place draws it: the one source both
 * the studio's previews and the asset generator read. Filenames, the asset
 * manifest and writing files are the generator's; this says what each image
 * shows.
 */

export type SlotId = 'favicon' | 'appleTouchIcon' | 'githubAvatar' | 'readmeHeader' | 'meetupPhoto' | 'studio';

/** Behind the drawing: the viewer's own page, nothing, or a colour fixed into the image. */
type SlotBackground = { kind: 'page' } | { kind: 'transparent' } | { kind: 'fixed'; colour: string };

export interface SlotRecipe {
  id: SlotId;
  name: string;
  composition: 'emblem' | 'lockup';
  /** One theme for an image everyone sees alike; both for a light and dark pair. */
  themes: readonly Theme[];
  background: SlotBackground;
  /**
   * The step drawn. `bySize` leaves it to `detailForDiameter` at each size
   * shown (the studio, which draws live at every size).
   */
  detail: Detail | 'bySize';
  /** Why a fixed step departs from what the smallest display size would choose. */
  detailReason?: string;
  /** The image's own size in its units; none for a drawing framed by its content. */
  canvas?: { width: number; height: number };
  /** The emblem's square side in canvas units (in CSS px where there is no canvas); content is centred. */
  emblemSide: number;
  /** Where the content must stay, in canvas units, clear of crops and overlays. */
  safe?: Box;
  /**
   * The smallest the image is seen: its width in CSS px where it is shown,
   * never the file's pixels, and where that number came from.
   */
  smallestDisplay: { width: number; source: string };
}

const githubDark = { kind: 'fixed', colour: palette.darkPage } as const;

export const slotRecipes: readonly SlotRecipe[] = [
  {
    id: 'favicon',
    name: 'Favicon (SVG and 32 px PNG)',
    composition: 'emblem',
    // The smallest step carries no glass, so it draws the same in both themes and sits on any tab bar.
    themes: ['light'],
    background: { kind: 'transparent' },
    detail: 'none',
    canvas: { width: 32, height: 32 },
    emblemSide: 32,
    smallestDisplay: { width: 16, source: 'a browser tab’s favicon, 16 CSS px' },
  },
  {
    id: 'appleTouchIcon',
    name: 'Apple touch icon (180 px PNG)',
    composition: 'emblem',
    themes: ['dark'],
    // iOS fills a transparent icon with black and rounds its corners, so it gets the fixed ground.
    background: githubDark,
    detail: 'small',
    canvas: { width: 180, height: 180 },
    // Inset a tenth on each side, inside iOS's rounded corners.
    emblemSide: 144,
    smallestDisplay: { width: 40, source: 'Apple’s iPhone icon sizes: 60 pt on the home screen, 40 pt in Spotlight' },
  },
  {
    id: 'githubAvatar',
    name: 'GitHub organisation avatar',
    composition: 'emblem',
    themes: ['dark'],
    background: githubDark,
    detail: 'small',
    detailReason:
      'GitHub shows one image from 20 px in lists to about 100 px on the organisation’s page; the maintainer chose small, ' +
      'so places outside our control show the rim and a large TS, and the README carries the full bubble (30 October 2026).',
    canvas: { width: 500, height: 500 },
    emblemSide: 500,
    smallestDisplay: { width: 20, source: 'GitHub’s lists and search results, about 20 CSS px' },
  },
  {
    id: 'readmeHeader',
    name: 'README header (light and dark pair)',
    composition: 'lockup',
    themes: ['light', 'dark'],
    background: { kind: 'transparent' },
    detail: 'full',
    emblemSide: 96,
    smallestDisplay: {
      width: 290,
      source: 'GitHub’s README column on a 320 px phone, which shrinks the 308 px lockup a little',
    },
  },
  {
    id: 'meetupPhoto',
    name: 'Meetup group photo',
    composition: 'lockup',
    themes: ['dark'],
    background: githubDark,
    detail: 'full',
    canvas: { width: 1200, height: 675 },
    // The lockup at 80% of the width (it is 3.21 emblems wide), the most that stays inside the safe rectangle.
    emblemSide: 298,
    safe: { minX: 120, minY: 100, maxX: 1080, maxY: 575 },
    smallestDisplay: { width: 300, source: 'assumed: a group card in Meetup’s search results, to be confirmed' },
  },
  {
    id: 'studio',
    name: 'The studio’s previews',
    composition: 'emblem',
    themes: ['light', 'dark'],
    background: { kind: 'page' },
    detail: 'bySize',
    emblemSide: 96,
    smallestDisplay: { width: 16, source: 'the studio’s smallest preview' },
  },
];
