/**
 * The renderer acceptance: does resvg draw the registered candidates the
 * way the installed Google Chrome does? Run by hand, never in tests:
 *
 *   pnpm score --acceptance <evidence folder>
 *
 * Each candidate's registered SVG goes on an HTML page (zero margins, the
 * background colour behind, the SVG a block at the canvas size, a viewport
 * the same size, no scrolling) and Chrome's own headless screenshot is
 * compared with resvg's render, per region of the reference, against the
 * brief's limits; the rankings by either renderer must tie the same way.
 * Images and a table are written to the folder.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ciede2000, srgbToLab } from './colour';
import { accepts, differenceStats, type Stats } from './compare';
import { acceptanceCandidates } from './fixtures';
import { decodePng, encodePng, type RgbImage } from './image';
import { rankScores, type Ranking, type Scored } from './rank';
import { Region, type Reference } from './reference';
import { createScorer, scoreImage, type Parameters } from './scorer';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function page(svg: string, background: string, width: number, height: number) {
  return (
    '<!doctype html><html><head><meta charset="utf-8"><style>' +
    `html,body{margin:0;padding:0;overflow:hidden;background:${background};width:${width}px;height:${height}px}` +
    `svg{display:block;width:${width}px;height:${height}px}` +
    `</style></head><body>${svg}</body></html>`
  );
}

/** Mean and largest CIEDE2000 between the two renders, per region. */
function deltaE(a: RgbImage, b: RgbImage, reference: Reference) {
  const out: Record<string, { mean: number; max: number }> = {};
  for (const [name, code] of Object.entries(Region)) {
    let sum = 0;
    let max = 0;
    let n = 0;
    for (let p = 0; p < reference.region.length; p++) {
      if (reference.region[p] !== code) continue;
      const i = p * 3;
      const d = ciede2000(
        srgbToLab(a.data[i] ?? 0, a.data[i + 1] ?? 0, a.data[i + 2] ?? 0),
        srgbToLab(b.data[i] ?? 0, b.data[i + 1] ?? 0, b.data[i + 2] ?? 0),
      );
      sum += d;
      max = Math.max(max, d);
      n++;
    }
    out[name] = { mean: n ? sum / n : 0, max };
  }
  return out;
}

const groupsOf = (r: Ranking) => r.groups.map((g) => g.map((c) => c.label));

/** Rankings by both renderers, with the given parameters, and whether their tie groups agree. */
function compareRankings(resvg: Scored[], chrome: Scored[], parameters: Parameters) {
  const a = rankScores(resvg, parameters.tieTolerance);
  const b = rankScores(chrome, parameters.tieTolerance);
  const same = JSON.stringify(groupsOf(a)) === JSON.stringify(groupsOf(b));
  return { resvg: groupsOf(a), chrome: groupsOf(b), same };
}

const f = (v: number, d = 3) => v.toFixed(d);

function tableRow(label: string, s: Stats, de: Record<string, { mean: number; max: number }>, broken: string[]) {
  const cell = (r: keyof Stats) =>
    `${f(s[r].mean)} / ${s[r].p99} / ${s[r].over32} (ΔE00 ${f(de[r]?.mean ?? 0, 2)} mean, ${f(de[r]?.max ?? 0, 1)} max)`;
  return `| ${label} | ${cell('sheets')} | ${cell('tile')} | ${cell('background')} | ${broken.length ? broken.join('; ') : 'pass'} |`;
}

/** Runs the acceptance into `folder`; true when resvg is accepted. */
export async function runAcceptance(folder: string): Promise<boolean> {
  const out = resolve(folder);
  const profile = join(out, `chrome-profile-${Date.now()}`);
  await mkdir(profile, { recursive: true });
  const chromeVersion = execFileSync(CHROME, ['--version'], { encoding: 'utf8' }).trim();
  const scorer = await createScorer();
  const { reference, parameters } = scorer;
  const { width, height } = reference.registration.canvas;
  const bg = `#${reference.registration.background.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

  const rows: string[] = [];
  const resvgScores: Scored[] = [];
  const chromeScores: Scored[] = [];
  let allPass = true;
  for (const { label, config } of acceptanceCandidates) {
    const { svg, clipped, image } = scorer.render(config);
    const html = join(out, `${label}.html`);
    const shot = join(out, `${label}.chrome.png`);
    await writeFile(html, page(svg, bg, width, height));
    await writeFile(join(out, `${label}.resvg.png`), encodePng(image));
    execFileSync(
      CHROME,
      [
        '--headless',
        `--screenshot=${shot}`,
        `--window-size=${width},${height}`,
        '--force-device-scale-factor=1',
        '--hide-scrollbars',
        `--user-data-dir=${profile}`,
        pathToFileURL(html).href,
      ],
      { stdio: 'ignore' },
    );
    const chrome = decodePng(await readFile(shot), { width, height }, `${label}.chrome.png`);
    const stats = differenceStats(image, chrome, reference.region);
    const broken = accepts(stats);
    if (broken.length) allPass = false;
    rows.push(tableRow(label, stats, deltaE(image, chrome, reference), broken));
    resvgScores.push({ label, score: scoreImage(image, clipped, reference, parameters) });
    chromeScores.push({ label, score: scoreImage(chrome, clipped, reference, parameters) });
  }

  const ranked = compareRankings(resvgScores, chromeScores, parameters);
  if (!ranked.same) allPass = false;
  const scoreRows = resvgScores.map((r, i) => {
    const c = chromeScores[i]?.score;
    return `| ${r.label} | ${f(r.score.objective)} | ${f(c?.objective ?? NaN)} | ${f(r.score.iou)} | ${f(c?.iou ?? NaN)} |`;
  });
  const report = [
    `# Renderer acceptance`,
    '',
    `${chromeVersion}; @resvg/resvg-js as in package.json; canvas ${width} × ${height}.`,
    '',
    'Per region: mean / p99 (nearest rank) / pixels over 32 of the largest channel difference (0-255), with the',
    'CIEDE2000 between the two renders. Limits: sheets and tile mean ≤ 2 and p99 ≤ 8, background mean ≤ 1, at most',
    '0.1% of a region over 32.',
    '',
    '| candidate | sheets | tile | background | verdict |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
    '| candidate | objective (resvg) | objective (Chrome) | IoU (resvg) | IoU (Chrome) |',
    '| --- | --- | --- | --- | --- |',
    ...scoreRows,
    '',
    `Tie groups, resvg: ${JSON.stringify(ranked.resvg)}`,
    `Tie groups, Chrome: ${JSON.stringify(ranked.chrome)}`,
    `Same tie groups: ${ranked.same ? 'yes' : 'no'}`,
    '',
    `Verdict: ${allPass ? 'resvg accepted' : 'resvg NOT accepted'}`,
  ].join('\n');
  await writeFile(join(out, 'acceptance.md'), `${report}\n`);
  await writeFile(
    join(out, 'acceptance-scores.json'),
    `${JSON.stringify({ chromeVersion, resvg: resvgScores, chrome: chromeScores }, null, 2)}\n`,
  );
  console.log(report);
  return allPass;
}
