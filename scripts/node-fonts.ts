import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { parseBubbleFonts, type BubbleFonts } from '../src/bubble/wordmark/fonts';
import { bubbleFontFiles, fontFiles, parseLogoFonts, type FontRole, type LogoFonts } from '../src/shared';

const require = createRequire(import.meta.url);

async function readFontFile(file: string): Promise<ArrayBuffer> {
  const bytes = await readFile(require.resolve(file));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

const readFont = (role: FontRole) => readFontFile(fontFiles[role]);

/** Loads the logo fonts from node_modules (generator script and tests). */
export async function loadLogoFontsFromDisk(): Promise<LogoFonts> {
  const [serif, sans] = await Promise.all([readFont('serif'), readFont('sans')]);
  return parseLogoFonts({ serif, sans });
}

/** Loads the bubble logo's fonts from node_modules (generator script and tests). */
export async function loadBubbleFontsFromDisk(): Promise<BubbleFonts> {
  return parseBubbleFonts({ wordmark: await readFontFile(bubbleFontFiles.wordmark) });
}
