/**
 * Regenerates the bubble logo's assets, exactly the files the manifest
 * lists, and removes anything else in the folder:
 *
 *   pnpm generate:assets
 *
 * The files in public/assets are build artefacts; change the drawing in
 * src/bubble/ (each slot's recipe in engine/slots.ts) and the files in
 * src/bubble/assets/manifest.ts instead.
 */
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { assetManifest } from '../src/bubble/assets/manifest';
import { pngSize, renderAssetSvg } from '../src/bubble/assets/renderAsset';
import { tileLettering } from '../src/bubble/engine';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from './node-fonts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'assets');

const inputs = {
  lettering: tileLettering((await loadLogoFontsFromDisk()).sans),
  font: (await loadBubbleFontsFromDisk()).wordmark,
};
await mkdir(outDir, { recursive: true });

const listed = new Set(assetManifest.map((entry) => entry.file));
for (const file of await readdir(outDir)) {
  if (listed.has(file)) continue;
  await rm(join(outDir, file), { recursive: true });
  console.log(`${relative(root, join(outDir, file))}  removed: not in the manifest`);
}

for (const entry of assetManifest) {
  const file = join(outDir, entry.file);
  const svg = renderAssetSvg(entry, inputs);
  // The SVG is already outlined, so resvg needs no fonts; system fonts stay out so every machine renders alike.
  const bytes =
    entry.format === 'svg'
      ? svg
      : new Resvg(svg, { fitTo: { mode: 'width', value: pngSize(entry).width }, font: { loadSystemFonts: false } })
          .render()
          .asPng();
  await writeFile(file, bytes);
  console.log(`${relative(root, file)}  ${(bytes.length / 1024).toFixed(1)} KiB`);
}
