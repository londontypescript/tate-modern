/**
 * How much of the bubble a drawing keeps: one logo, simplified as it is seen
 * smaller. `full` is the reference's drawing; `small` cuts the glass to a
 * body, a rim and one highlight; `tiny` drops the bubble, leaving the fan
 * and a bigger tile; `none` is tiny without its TS, at sizes where the
 * letters can't be read.
 */
export type Detail = 'full' | 'small' | 'tiny' | 'none';

/** From most detail to least. */
export const details: readonly Detail[] = ['full', 'small', 'tiny', 'none'];

/**
 * The smallest sphere diameter, in CSS pixels, each step is drawn at, as the
 * maintainer approved them from previews at real size. Below the last, the
 * drawing is `none`. A 56 px frame holds a 52.3 px sphere, so the reference
 * lockup's 56 px emblem keeps the full bubble.
 */
const smallestDiameter: readonly { detail: Detail; from: number }[] = [
  { detail: 'full', from: 52 },
  { detail: 'small', from: 28 },
  { detail: 'tiny', from: 21 },
];

/**
 * The detail to draw for a sphere seen `diameter` CSS pixels across where it
 * is shown: never the file's or canvas's pixel size, since a large upload
 * may still be shown small (a GitHub avatar at 20 px). A slot seen at several
 * sizes is drawn for its smallest. Steps without a sphere are still chosen by
 * the diameter the full sphere would have in the same frame.
 */
export function detailForDiameter(diameter: number): Detail {
  if (!Number.isFinite(diameter) || diameter <= 0) throw new Error(`Not a display diameter: ${diameter}`);
  return smallestDiameter.find((step) => diameter >= step.from)?.detail ?? 'none';
}
