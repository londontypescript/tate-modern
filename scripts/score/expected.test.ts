/**
 * The scores of the fixtures as computed on macOS (arm64), committed in
 * expected.json, recomputed here on whatever runs the tests (CI's Linux
 * included): every component within 0.05 and every tie group unchanged.
 *
 * To regenerate deliberately (after a change that should move the scores):
 *
 *   SCORE_WRITE_EXPECTED=1 pnpm exec vitest run scripts/score/expected.test.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { acceptanceCandidates, checkpointB } from './fixtures';
import type { Ranking, Score } from './rank';
import { createScorer } from './scorer';

const file = join(dirname(fileURLToPath(import.meta.url)), 'expected.json');
const candidates = [
  ...checkpointB,
  ...acceptanceCandidates.filter((c) => !checkpointB.some((b) => b.label === c.label)),
];
const TOLERANCE = 0.05;

interface Expected {
  platform: string;
  scores: Record<string, Score>;
  groups: string[][];
}

let scores: Record<string, Score>;
let ranking: Ranking;
beforeAll(async () => {
  const scorer = await createScorer();
  scores = Object.fromEntries(candidates.map(({ label, config }) => [label, scorer.score(config)]));
  ranking = scorer.rank(candidates);
}, 60_000);

const groups = (r: Ranking) => r.groups.map((g) => g.map((c) => c.label));

describe('expected scores', () => {
  it('match the committed macOS scores within 0.05, with the same tie groups', () => {
    if (process.env.SCORE_WRITE_EXPECTED === '1') {
      const expected: Expected = { platform: `${process.platform} ${process.arch}`, scores, groups: groups(ranking) };
      writeFileSync(file, `${JSON.stringify(expected, null, 2)}\n`);
    }
    const expected = JSON.parse(readFileSync(file, 'utf8')) as Expected;
    expect(Object.keys(scores).sort()).toEqual(Object.keys(expected.scores).sort());
    const off: string[] = [];
    for (const [label, want] of Object.entries(expected.scores)) {
      const got = scores[label] as Score;
      for (const key of ['sheets', 'tile', 'spill', 'objective', 'iou'] as const) {
        if (Math.abs(got[key] - want[key]) > TOLERANCE) off.push(`${label}.${key}: ${got[key]} against ${want[key]}`);
      }
      if (got.eligible !== want.eligible) off.push(`${label}: eligibility changed`);
    }
    expect(off, 'scores moved from the committed macOS values').toEqual([]);
    expect(groups(ranking), 'tie groups changed').toEqual(expected.groups);
  });
});
