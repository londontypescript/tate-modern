/**
 * Writes the London TypeScript banner: the lockup with optional text beside
 * it, as a strip for READMEs and websites or framed for the Meetup photo.
 *
 *   pnpm banner --text "Tate Modern" --band bottom --out docs/images
 *
 * `--help` lists the options. The drawing's rules live in src/bubble/banner/.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { bannerFileName, layoutBanner, renderBannerSvg } from '../src/bubble/banner';
import { tileLettering } from '../src/bubble/engine';
import { parseBannerArgs, usage } from './banner/args';
import { outputPath } from './banner/output';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from './node-fonts';

let command;
try {
  command = parseBannerArgs(process.argv.slice(2));
} catch (error) {
  console.error(`${error instanceof Error ? error.message : String(error)}\n\n${usage}`);
  process.exit(1);
}
if (!command) {
  console.log(usage);
  process.exit(0);
}

const fonts = await loadBubbleFontsFromDisk();
const lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
await mkdir(command.outDir, { recursive: true });

for (const options of command.banners) {
  const layout = layoutBanner(fonts, options);
  const svg = renderBannerSvg(layout, lettering);
  for (const format of command.formats) {
    const file = outputPath(command.outDir, bannerFileName(options, svg, format));
    // The SVG is already outlined, so resvg needs no fonts; system fonts stay out so every machine renders alike.
    const bytes =
      format === 'svg'
        ? svg
        : new Resvg(svg, { fitTo: { mode: 'width', value: layout.canvas.width }, font: { loadSystemFonts: false } })
            .render()
            .asPng();
    await writeFile(file, bytes);
    console.log(`${relative(process.cwd(), file)}  ${(bytes.length / 1024).toFixed(1)} KiB`);
  }
}
