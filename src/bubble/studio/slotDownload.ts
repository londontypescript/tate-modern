import { assetManifest } from '../assets/manifest';
import type { SlotEdges, SlotRecipe } from '../engine';
import { edgeSuffix } from '../react/renderSlot';

/**
 * The studio's download name for a slot's image: the committed file's own
 * name, with the band and corners added, so a plain download is named as
 * the asset it matches.
 */
export function slotFileName(recipe: SlotRecipe, edges: SlotEdges, format: 'svg' | 'png') {
  const committed = assetManifest.find((e) => e.source.kind === 'slot' && e.source.recipe.id === recipe.id);
  if (!committed) throw new Error(`No committed ${recipe.id} image to name the download after`);
  return `${committed.file.replace(/\.(svg|png)$/, '')}${edgeSuffix(edges)}.${format}`;
}

/**
 * The SVG drawn into a PNG of `size` pixels by the browser itself, as the
 * file Meetup takes. The SVG carries no text or linked files, so nothing
 * has to load first.
 */
export async function svgToPng(svg: string, size: { width: number; height: number }): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image(size.width, size.height);
    image.src = url;
    await image.decode();
    const canvas = Object.assign(document.createElement('canvas'), size);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser gives no 2D canvas to draw the PNG on');
    context.drawImage(image, 0, 0, size.width, size.height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob((png) => (png ? resolve(png) : reject(new Error('The browser made no PNG'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Saves `blob` as a file named `name`, through a temporary link, as `downloadSvg` does for text. */
export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}
