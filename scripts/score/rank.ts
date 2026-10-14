/**
 * Ranking scored candidates: eligible ones best first, in tie groups, and
 * the ineligible ones apart with their reasons.
 */

export interface Score {
  /** Mean CIEDE2000 over the reference's sheet region. */
  sheets: number;
  /** Mean CIEDE2000 over the reference's tile region. */
  tile: number;
  /** Summed CIEDE2000 over the reference's background, per sheet-region pixel. */
  spill: number;
  /** sheets + spill + wTile × tile: lower is closer to the original. */
  objective: number;
  /** Intersection over union of the candidate's silhouette and the reference's. */
  iou: number;
  /** Whether any of the candidate's art falls outside the canvas. */
  clipped: boolean;
  eligible: boolean;
  /** Why the candidate is ineligible. */
  reason?: string;
}

export interface Scored {
  label: string;
  score: Score;
}

export interface Ranking {
  /** Eligible candidates, best group first; each group ordered by label. */
  groups: Scored[][];
  ineligible: Scored[];
  noneEligible: boolean;
}

const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Sorts eligible candidates by objective. The first opens a group; each
 * next one joins the current group when within `tolerance` of that group's
 * best, or opens a new group.
 */
export function rankScores(list: readonly Scored[], tolerance: number): Ranking {
  const seen = new Set<string>();
  for (const { label } of list) {
    if (seen.has(label)) throw new Error(`duplicate label "${label}"`);
    seen.add(label);
  }
  const eligible = list
    .filter((c) => c.score.eligible)
    .sort((a, b) => a.score.objective - b.score.objective || byCodePoint(a.label, b.label));
  const groups: Scored[][] = [];
  let best = Number.NaN;
  for (const candidate of eligible) {
    const current = groups.at(-1);
    if (current && candidate.score.objective - best <= tolerance) {
      current.push(candidate);
    } else {
      groups.push([candidate]);
      best = candidate.score.objective;
    }
  }
  for (const group of groups) group.sort((a, b) => byCodePoint(a.label, b.label));
  return {
    groups,
    ineligible: list.filter((c) => !c.score.eligible),
    noneEligible: groups.length === 0,
  };
}
