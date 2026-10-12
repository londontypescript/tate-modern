import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fontFiles, parseLogoFonts, type FontRole, type LogoFonts } from '../src/shared';

const require = createRequire(import.meta.url);

async function readFont(role: FontRole): Promise<ArrayBuffer> {
  const bytes = await readFile(require.resolve(fontFiles[role]));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** Loads the logo fonts from node_modules (generator script and tests). */
export async function loadLogoFontsFromDisk(): Promise<LogoFonts> {
  const [serif, sans] = await Promise.all([readFont('serif'), readFont('sans')]);
  return parseLogoFonts({ serif, sans });
}
