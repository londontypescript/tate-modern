/** The page themes the bubble logo is drawn for. */
export type Theme = 'light' | 'dark';

/**
 * The wordmark's colours in each theme. Light: GitHub's dark text and the
 * brand blue. Dark: GitHub's near-white text and the blue lifted for a dark
 * page, as the reference lockup sets them.
 */
export const wordmarkColours = {
  light: { ink: '#1f2328', blue: '#1275ec' },
  dark: { ink: '#f0f6fc', blue: '#3d8bff' },
} as const satisfies Record<Theme, { ink: string; blue: string }>;

/**
 * The page each theme is judged against for contrast: white, and GitHub's
 * dark background.
 */
export const themeBackgrounds = {
  light: '#ffffff',
  dark: '#0d1117',
} as const satisfies Record<Theme, string>;
