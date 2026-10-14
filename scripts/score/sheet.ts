/**
 * True-scale contact sheets: the original first, then each candidate, every
 * image the identical registered canvas shown at the same width, so sizes
 * and colours compare as they really are (never scaled to their own box).
 *
 *   pnpm score --sheet <configs.json> <folder>
 */
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { encodePng } from './image';
import { referenceDir } from './reference';
import type { createScorer } from './scorer';
import type { Candidate } from './validate';

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** The sheet's page, for images already written next to it. */
export function sheetHtml(cells: readonly { file: string; caption: string }[]): string {
  const figure = (file: string, caption: string) =>
    `<figure><img src="${escape(file)}" alt="${escape(caption)}"><figcaption>${escape(caption)}</figcaption></figure>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Contact sheet</title>
<style>
:root{--bg:#f4f1ea;--fg:#1d1d1f;--muted:#5f5b53}
@media (prefers-color-scheme: dark){:root{--bg:#1c1b19;--fg:#f1efe9;--muted:#b3ada2}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
p{margin:0 0 16px;color:var(--muted);max-width:72ch}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:16px}
figure{margin:0} img{display:block;width:100%;height:auto;border-radius:6px}
figcaption{margin-top:6px}
</style></head><body>
<p>Every image is the same registered canvas at the same width: true scale, the tile placed identically in each.</p>
<div class="grid">
${[figure('original.png', 'The original (ChatGPT)'), ...cells.map((c) => figure(c.file, c.caption))].join('\n')}
</div>
</body></html>
`;
}

/** Writes the sheet and its images into `folder`; returns the page's path. */
export async function writeSheet(
  scorer: Awaited<ReturnType<typeof createScorer>>,
  candidates: readonly Candidate[],
  folder: string,
): Promise<string> {
  const out = resolve(folder);
  await mkdir(out, { recursive: true });
  await copyFile(join(referenceDir, 'mark.png'), join(out, 'original.png'));
  const cells = [];
  for (const [i, { label, config }] of candidates.entries()) {
    const { image, clipped } = scorer.render(config);
    const file = `${i + 1}.png`;
    await writeFile(join(out, file), encodePng(image));
    cells.push({ file, caption: clipped ? `${label} (clipped)` : label });
  }
  const page = join(out, 'sheet.html');
  await writeFile(page, sheetHtml(cells));
  return page;
}
