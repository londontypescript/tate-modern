/**
 * Every parameter of the score, frozen here. Changing one changes what
 * every past score meant, so each change is deliberate and recorded in
 * docs/studio/scoring.md. Eligibility has no parameter: it is the colour
 * scope (scope.ts) and clipping.
 */
import { FOREGROUND_DELTA_E } from './reference';

export const scoreParameters = {
  /** For the IoU diagnostic: a pixel is drawn when its CIEDE2000 from the background exceeds this. */
  foregroundDeltaE: FOREGROUND_DELTA_E,
  /** The tile's weight in the objective, sheets + spill + wTile × tile. */
  wTile: 1,
  /** Candidates within this of their group's best objective tie. */
  tieTolerance: 0.25,
} as const;

/**
 * What the ranking is worth, printed with every result: it failed the one
 * test against the maintainer's eye, so it is diagnostic only.
 */
export const validation =
  'NOT VALIDATED against the maintainer’s eye: at Checkpoint B (14 Oct 2026) the ranking disagreed with the ' +
  'maintainer’s order (Spearman’s ρ −0.245; maintainer K, W, R, then five tied; score H W P F R C M K), mostly ' +
  'from the tile term (ρ −0.71 alone). Use the scores as diagnostics, never to pick a look; visible damage is ' +
  'judged by eye.';
