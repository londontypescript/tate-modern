/**
 * Regenerates the standalone SVG assets from the approved configuration:
 *
 *   npm run generate:assets
 *
 * The files in public/assets are build artefacts; edit src/logo instead.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderLogoSvg, svgFileName, svgVariants } from '../src/components/renderSvg';
import { buildLogo, defaultLogoConfig } from '../src/logo';
import { loadLogoFontsFromDisk } from './node-fonts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'assets');

const logo = buildLogo(defaultLogoConfig, await loadLogoFontsFromDisk());
await mkdir(outDir, { recursive: true });

for (const variant of svgVariants) {
  const file = join(outDir, svgFileName(variant));
  const svg = renderLogoSvg(variant, logo);
  await writeFile(file, svg);
  console.log(`${relative(root, file)}  ${(svg.length / 1024).toFixed(1)} KiB`);
}
