import * as opentypeNamespace from 'opentype.js';
import type { Font } from 'opentype.js';

/**
 * Fonts used by the logo, both SIL Open Font License 1.1:
 *
 * - Playfair Display Black: high-contrast transitional serif with ball
 *   terminals, closest to the reference's editorial wordmark.
 * - Open Sans ExtraBold: humanist sans close to the Segoe-style letters of the
 *   official TypeScript mark.
 *
 * Glyphs are converted to outlines at render time, so no viewer needs them.
 * Each environment loads the bytes its own way (Vite URL import in the
 * browser, the file system in Node) and hands them to `parseLogoFonts`.
 */
export const fontFiles = {
  serif: '@fontsource/playfair-display/files/playfair-display-latin-900-normal.woff',
  sans: '@fontsource/open-sans/files/open-sans-latin-800-normal.woff',
} as const;

export type FontRole = keyof typeof fontFiles;

export interface LogoFonts {
  serif: Font;
  sans: Font;
}

// opentype.js ships a UMD build for Node and the browser, so the module
// namespace may hide its API behind `default`.
const opentype: typeof opentypeNamespace =
  (opentypeNamespace as unknown as { default?: typeof opentypeNamespace }).default ?? opentypeNamespace;

export function parseLogoFonts(buffers: Record<FontRole, ArrayBuffer>): LogoFonts {
  return {
    serif: opentype.parse(buffers.serif),
    sans: opentype.parse(buffers.sans),
  };
}
