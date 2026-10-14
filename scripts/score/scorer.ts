/**
 * The score as a library: `createScorer()` loads the fonts and the
 * committed reference once, then scores and ranks flat logo configurations.
 */
import { buildLogo, type LogoConfig } from '../../src/concepts/flat/engine';
import type { Point } from '../../src/shared';
import { loadLogoFontsFromDisk } from '../node-fonts';
import type { RgbImage } from './image';
import { measure } from './metrics';
import { scoreParameters } from './parameters';
import { rankScores, type Ranking, type Score } from './rank';
import { candidateSvg, renderWithResvg } from './rasterise';
import { loadReference, type Reference } from './reference';
import type { Candidate } from './validate';

export type Parameters = typeof scoreParameters;

/** A rendered candidate's score, from its pixels and whether it was clipped. */
export function scoreImage(image: RgbImage, clipped: boolean, reference: Reference, parameters: Parameters): Score {
  const c = measure(image, reference);
  const objective = c.sheets + c.spill + parameters.wTile * c.tile;
  const reason = clipped
    ? 'clipped: part of the mark falls outside the canvas'
    : c.iou < parameters.iouFloor
      ? `silhouette IoU ${c.iou.toFixed(3)} is below the floor ${parameters.iouFloor}`
      : undefined;
  return { ...c, objective, clipped, eligible: reason === undefined, ...(reason && { reason }) };
}

export async function createScorer(parameters: Parameters = scoreParameters) {
  const [fonts, reference] = await Promise.all([loadLogoFontsFromDisk(), loadReference()]);

  /** The candidate drawn on the canvas, optionally shifted after the transform. */
  function render(config: LogoConfig, offset?: Point) {
    const { svg, clipped } = candidateSvg(buildLogo(config, fonts), reference.registration, offset);
    return { svg, clipped, image: renderWithResvg(svg, reference.registration.canvas) };
  }

  function score(config: LogoConfig, offset?: Point): Score {
    const { image, clipped } = render(config, offset);
    return scoreImage(image, clipped, reference, parameters);
  }

  function rank(list: readonly Candidate[]): Ranking {
    return rankScores(
      list.map(({ label, config }) => ({ label, score: score(config) })),
      parameters.tieTolerance,
    );
  }

  return { reference, parameters, render, score, rank };
}
