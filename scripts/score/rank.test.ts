import { describe, expect, it } from 'vitest';
import { rankScores, type Score } from './rank';

const score = (objective: number, extra: Partial<Score> = {}): Score => ({
  sheets: objective,
  tile: 0,
  spill: 0,
  objective,
  iou: 1,
  clipped: false,
  eligible: true,
  ...extra,
});

const labels = (groups: { label: string }[][]) => groups.map((g) => g.map((c) => c.label));

describe('rankScores', () => {
  it('measures each tie group from its best, not from the previous candidate', () => {
    const ranking = rankScores(
      [
        { label: 'c', score: score(10.4) },
        { label: 'a', score: score(10.0) },
        { label: 'b', score: score(10.2) },
      ],
      0.25,
    );
    expect(labels(ranking.groups), 'a chain of small steps must not join one tie group').toEqual([['a', 'b'], ['c']]);
  });

  it('orders a tie group by label, by code point', () => {
    const ranking = rankScores(
      [
        { label: 'b', score: score(1.1) },
        { label: 'B', score: score(1.0) },
        { label: 'a', score: score(1.2) },
      ],
      0.25,
    );
    expect(labels(ranking.groups)).toEqual([['B', 'a', 'b']]);
  });

  it('includes a candidate exactly at the tolerance from the best', () => {
    expect(
      labels(
        rankScores(
          [
            { label: 'x', score: score(1) },
            { label: 'y', score: score(1.25) },
          ],
          0.25,
        ).groups,
      ),
    ).toEqual([['x', 'y']]);
  });

  it('keeps ineligible candidates apart, with their reasons', () => {
    const ranking = rankScores(
      [
        { label: 'ok', score: score(5) },
        { label: 'bad', score: score(1, { eligible: false, reason: 'clipped' }) },
      ],
      0.25,
    );
    expect(labels(ranking.groups)).toEqual([['ok']]);
    expect(ranking.ineligible.map((c) => [c.label, c.score.reason])).toEqual([['bad', 'clipped']]);
  });

  it('says when no candidate is eligible', () => {
    const ranking = rankScores([{ label: 'bad', score: score(1, { eligible: false, reason: 'clipped' }) }], 0.25);
    expect(ranking.groups).toEqual([]);
    expect(ranking.noneEligible).toBe(true);
  });

  it('refuses duplicate labels', () => {
    expect(() =>
      rankScores(
        [
          { label: 'a', score: score(1) },
          { label: 'a', score: score(2) },
        ],
        0.25,
      ),
    ).toThrow(/duplicate label "a"/);
  });
});
