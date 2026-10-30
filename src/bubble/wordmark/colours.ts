import { palette } from '../../shared/palette';
import type { Theme } from '../engine/types';

/**
 * The wordmark's colours in each theme. Light: GitHub's dark text (the
 * wordmark's own, so not in the palette) and the brand blue. Dark: GitHub's
 * near-white and the blue lifted for a dark page, as the reference lockup
 * sets them.
 */
export const wordmarkColours = {
  light: { ink: '#1f2328', blue: palette.blue },
  dark: { ink: palette.darkInk, blue: palette.liftedBlue },
} as const satisfies Record<Theme, { ink: string; blue: string }>;

/** The page each theme is judged against for contrast. */
export const themeBackgrounds = {
  light: palette.white,
  dark: palette.darkPage,
} as const satisfies Record<Theme, string>;
