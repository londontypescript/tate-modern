/**
 * The score's command line:
 *
 *   pnpm score <configs.json> [--json]
 *
 * ranks a list of `{ "label": …, "config": … }` flat logo configurations
 * against the 2D mockup (exit 1 on invalid input, 2 when none is
 * eligible). `--json` prints the ranking with its provenance.
 *
 *   pnpm score --sheet <configs.json> <folder>
 *   pnpm score --make-reference <decoded original.png>
 *   pnpm score --acceptance <evidence folder>
 *
 * write a true-scale contact sheet of the configurations, remake the
 * committed reference (see reference/README.md) and run the renderer
 * acceptance against the installed Google Chrome (see
 * docs/studio/scoring.md).
 *
 * The ranking is not validated against the maintainer's eye; see
 * `validation` in parameters.ts.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runAcceptance } from './acceptance';
import { decodePng, encodePng } from './image';
import { validation } from './parameters';
import { provenance } from './provenance';
import type { Ranking, Scored } from './rank';
import { referenceDir } from './reference';
import { makeReference } from './referenceMake';
import { createScorer } from './scorer';
import { writeSheet } from './sheet';
import { parseCandidates } from './validate';

async function writeReference(decoded: string) {
  const { mark, regions, registration } = makeReference(decodePng(await readFile(decoded), undefined, decoded));
  await writeFile(join(referenceDir, 'mark.png'), encodePng(mark));
  await writeFile(join(referenceDir, 'regions.png'), encodePng(regions));
  await writeFile(join(referenceDir, 'registration.json'), `${JSON.stringify(registration, null, 2)}\n`);
  console.log(`wrote ${referenceDir}`);
}

const f = (v: number) => v.toFixed(3);

/** The ranking as a fixed-width table. */
function rankingTable(ranking: Ranking): string {
  const header = ['group', 'label', 'objective', 'sheets', 'tile', 'spill', 'IoU', 'clipped'];
  const row = (group: string, { label, score: s }: Scored) => [
    group,
    label,
    f(s.objective),
    f(s.sheets),
    f(s.tile),
    f(s.spill),
    f(s.iou),
    s.clipped ? 'yes' : 'no',
  ];
  const rows = ranking.groups.flatMap((g, i) => g.map((c) => row(String(i + 1), c)));
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const line = (cells: string[]) =>
    cells
      .map((c, i) => c.padEnd(widths[i] ?? 0))
      .join('  ')
      .trimEnd();
  const out = [validation, '', line(header), ...rows.map(line)];
  if (ranking.noneEligible) out.push('no candidate is eligible');
  for (const c of ranking.ineligible) out.push(`ineligible  ${c.label}: ${c.score.reason ?? ''}`);
  return out.join('\n');
}

/** The candidates in a file, or undefined (exit 1) after saying why not. */
async function readCandidates(file: string) {
  try {
    return parseCandidates(JSON.parse(await readFile(file, 'utf8')));
  } catch (error) {
    console.error(`${file}: ${(error as Error).message}`);
    process.exitCode = 1;
    return undefined;
  }
}

async function sheet(file: string, folder: string) {
  const candidates = await readCandidates(file);
  if (!candidates) return;
  console.log(await writeSheet(await createScorer(), candidates, folder));
}

async function score(file: string, asJson: boolean) {
  const candidates = await readCandidates(file);
  if (!candidates) return;
  const scorer = await createScorer();
  const ranking = scorer.rank(candidates);
  if (asJson) {
    console.log(
      JSON.stringify({ ranking, provenance: await provenance(scorer.reference, scorer.parameters) }, null, 2),
    );
  } else {
    console.log(rankingTable(ranking));
  }
  if (ranking.noneEligible) process.exitCode = 2;
}

const args = process.argv.slice(2);
const [first, second, third] = args;
if (first === '--sheet' && second && third) {
  await sheet(second, third);
} else if (first === '--make-reference' && second) {
  await writeReference(second);
} else if (first === '--acceptance' && second) {
  process.exitCode = (await runAcceptance(second)) ? 0 : 1;
} else if (first && !first.startsWith('--') && args.slice(1).every((a) => a === '--json')) {
  await score(first, args.includes('--json'));
} else {
  console.error(
    'usage: pnpm score <configs.json> [--json]\n' +
      '       pnpm score --sheet <configs.json> <folder>\n' +
      '       pnpm score --make-reference <decoded original.png>\n' +
      '       pnpm score --acceptance <evidence folder>',
  );
  process.exitCode = 1;
}
