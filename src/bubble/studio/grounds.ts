import { palette } from '../../shared/palette';
import type { Theme } from '../engine';

/** The ground each theme is drawn for: white, and GitHub's dark page. */
export const homeGround: Record<Theme, string> = { light: palette.white, dark: palette.darkPage };

/** The ground each theme is not drawn for, where the mismatch check shows it. */
export const otherGround: Record<Theme, string> = { light: palette.darkPage, dark: palette.white };

const isDark = (ground: string) => ground === palette.darkPage;

/** How a caption names the ground. */
export const groundName = (ground: string) => (isDark(ground) ? palette.darkPage : 'white');

/** Small print that stays readable on the ground. */
export const captionClass = (ground: string) =>
  `font-mono text-[11px] ${isDark(ground) ? 'text-stone-400' : 'text-stone-500'}`;

/** A caption's own text, on the ground. */
export const noteClass = (ground: string) => `text-xs ${isDark(ground) ? 'text-stone-400' : 'text-stone-600'}`;

/** A caption's emphasised words, on the ground. */
export const strongClass = (ground: string) => `font-medium ${isDark(ground) ? 'text-stone-100' : 'text-stone-800'}`;

/** A hairline that shows on the ground without competing with the drawing. */
export const borderClass = (ground: string) => (isDark(ground) ? 'border-stone-700' : 'border-stone-200');
