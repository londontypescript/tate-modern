import { parseLogoFonts, type LogoFonts } from '../logo';
// These specifiers mirror `fontFiles` in logo/fonts.ts; Vite needs literals.
import serifUrl from '@fontsource/playfair-display/files/playfair-display-latin-900-normal.woff?url';
import sansUrl from '@fontsource/open-sans/files/open-sans-latin-800-normal.woff?url';

let fonts: Promise<LogoFonts> | undefined;

const fetchBytes = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load font ${url}: ${response.status}`);
  return response.arrayBuffer();
};

/** Loads and parses the logo fonts once; suitable for React's `use()`. */
export function loadLogoFonts(): Promise<LogoFonts> {
  fonts ??= Promise.all([fetchBytes(serifUrl), fetchBytes(sansUrl)]).then(([serif, sans]) =>
    parseLogoFonts({ serif, sans }),
  );
  return fonts;
}
