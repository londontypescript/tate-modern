/**
 * How much of the bubble a drawing keeps. Only `full`, the reference's
 * drawing, exists so far; simpler steps for small sizes are added beside it,
 * with the breakpoints that choose them, once they are approved.
 */
export type Detail = 'full';

/**
 * The detail to draw for a sphere seen `diameter` CSS pixels across where it
 * is shown: never the file's or canvas's pixel size, since a large upload
 * may still be shown small (a GitHub avatar at 20 px). A slot seen at several
 * sizes is drawn for its smallest.
 */
export function detailForDiameter(diameter: number): Detail {
  if (!Number.isFinite(diameter) || diameter <= 0) throw new Error(`Not a display diameter: ${diameter}`);
  return 'full';
}
