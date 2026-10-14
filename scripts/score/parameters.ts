/**
 * Every parameter of the score, frozen here. Changing one changes what
 * every past score meant, so each change is deliberate and recorded in
 * docs/studio/scoring.md.
 */
import { FOREGROUND_DELTA_E } from './reference';

export const scoreParameters = {
  /** A pixel is foreground when its CIEDE2000 from the background exceeds this. */
  foregroundDeltaE: FOREGROUND_DELTA_E,
  /** The least silhouette overlap (IoU) an eligible candidate may have. */
  iouFloor: 0.8,
  /** The tile's weight in the objective, sheets + spill + wTile × tile. */
  wTile: 1,
  /** Candidates within this of their group's best objective tie. */
  tieTolerance: 0.25,
} as const;
