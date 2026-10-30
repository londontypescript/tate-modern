// This specifier mirrors `bubbleFontFiles` in shared/fonts.ts; Vite needs a
// literal. Only the bubble's pages import this file, so the frozen studio
// never fetches Exo 2.
import wordmarkUrl from '@fontsource/exo-2/files/exo-2-latin-700-normal.woff?url';
import { parseBubbleFonts, type BubbleFonts } from './fonts';

let fonts: Promise<BubbleFonts> | undefined;

const fetchBytes = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load font ${url}: ${response.status}`);
  return response.arrayBuffer();
};

/** Loads and parses the bubble's fonts once; suitable for React's `use()`. */
export function loadBubbleFonts(): Promise<BubbleFonts> {
  fonts ??= fetchBytes(wordmarkUrl).then((wordmark) => parseBubbleFonts({ wordmark }));
  return fonts;
}
