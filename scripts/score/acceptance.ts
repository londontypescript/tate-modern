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
 * brief's limits, then the two renderers' scores are compared as the
 * brief's second amendment sets out (see `rendererAgreement`). Images and a
 * table are written to the folder.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ciede2000, srgbToLab } from './colour';
import { accepts, differenceStats, limits, rendererAgreement, type Stats } from './compare';
import { acceptanceCandidates, acceptanceColourings, frozen } from './fixtures';
import { decodePng, encodePng, type RgbImage } from './image';
import { rankScores, type Ranking, type Scored } from './rank';
import { outOfScope } from './scope';
import { Region, type Reference } from './reference';
import { createScorer, scoreImage } from './scorer';

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

const f = (v: number, d = 3) => v.toFixed(d);

/** Means first, then the local maxima, per region. */
function tableRows(label: string, s: Stats, de: Record<string, { mean: number; max: number }>, broken: string[]) {
  const means = (r: keyof Stats) => `${f(s[r].mean)} (ΔE00 ${f(de[r]?.mean ?? 0, 2)})`;
  const maxima = (r: keyof Stats) =>
    `p99 ${s[r].p99}, max ${s[r].max}, ${s[r].over32} over 32 (ΔE00 max ${f(de[r]?.max ?? 0, 1)})`;
  const verdict = broken.length ? broken.join('; ') : 'pass';
  return {
    mean: `| ${label} | ${means('sheets')} | ${means('tile')} | ${means('background')} | ${verdict} |`,
    max: `| ${label} | ${maxima('sheets')} | ${maxima('tile')} | ${maxima('background')} |`,
  };
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

  const meanRows: string[] = [];
  const maxRows: string[] = [];
  const resvgScores: Scored[] = [];
  const chromeScores: Scored[] = [];
  let pixelsPass = true;
  for (const { label, config } of [...acceptanceCandidates, ...acceptanceColourings]) {
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
    if (broken.length) pixelsPass = false;
    const rows = tableRows(label, stats, deltaE(image, chrome, reference), broken);
    meanRows.push(rows.mean);
    maxRows.push(rows.max);
    const outside = outOfScope(config, frozen);
    resvgScores.push({ label, score: scoreImage(image, clipped, outside, reference, parameters) });
    chromeScores.push({ label, score: scoreImage(chrome, clipped, outside, reference, parameters) });
  }

  const flat = (list: Scored[]) => list.map((c) => ({ label: c.label, ...c.score }));
  const agreement = rendererAgreement(flat(resvgScores), flat(chromeScores));
  const accepted = pixelsPass && agreement.failures.length === 0;
  const scoreRows = resvgScores.map((r, i) => {
    const c = chromeScores[i]?.score;
    return (
      `| ${r.label} | ${r.score.eligible ? 'yes' : 'no'} | ${f(r.score.objective)} | ${f(c?.objective ?? NaN)} | ` +
      `${f(agreement.epsilon[r.label] ?? NaN)} | ${f(r.score.iou)} | ${f(c?.iou ?? NaN)} |`
    );
  });
  const report = [
    `# Renderer acceptance`,
    '',
    `${chromeVersion}; @resvg/resvg-js as in package.json; canvas ${width} × ${height}.`,
    '',
    'Pixel limits: sheets and tile mean ≤ 2 and p99 ≤ 8, background mean ≤ 1, at most 0.1% of a region over 32',
    '(largest channel difference per pixel, 0-255).',
    '',
    '## Means (with mean CIEDE2000 between the renders)',
    '',
    '| candidate | sheets | tile | background | verdict |',
    '| --- | --- | --- | --- | --- |',
    ...meanRows,
    '',
    '## Local maxima',
    '',
    '| candidate | sheets | tile | background |',
    '| --- | --- | --- | --- |',
    ...maxRows,
    '',
    `## Scores (ε: each objective's difference between renderers, limit ${limits.epsilon})`,
    '',
    '| candidate | eligible | objective (resvg) | objective (Chrome) | ε | IoU (resvg) | IoU (Chrome) |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...scoreRows,
    '',
    `Failures: ${agreement.failures.length ? agreement.failures.join('; ') : 'none'}`,
    `Ambiguous pairs (gap within εᵢ + εⱼ under both renderers): ${JSON.stringify(agreement.ambiguous)}`,
    `Tie groups, resvg (reported only): ${JSON.stringify(groupsOf(rankScores(resvgScores, parameters.tieTolerance)))}`,
    `Tie groups, Chrome (reported only): ${JSON.stringify(groupsOf(rankScores(chromeScores, parameters.tieTolerance)))}`,
    '',
    `Verdict: ${accepted ? 'resvg accepted' : 'resvg NOT accepted'}`,
  ].join('\n');
  await writeFile(join(out, 'acceptance.md'), `${report}\n`);
  await writeFile(
    join(out, 'acceptance-scores.json'),
    `${JSON.stringify({ chromeVersion, parameters, resvg: resvgScores, chrome: chromeScores, agreement }, null, 2)}\n`,
  );
  console.log(report);
  return accepted;
}
