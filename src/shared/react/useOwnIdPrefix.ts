import { useId } from 'react';

// Node-safe, so renderers can use it: import this file directly, never through
// this folder's index, which includes the browser-only font loader.

/** Characters safe in an id that a `url(#…)` reference also names. */
const idSafe = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, '');

/**
 * The prefix for the ids a `url(#…)` must find (gradients, masks): the given
 * `idPrefix` as it is, else one of this drawing's own from React, so live
 * logos sharing a page never paint with each other's gradients.
 *
 * Exports always pass an `idPrefix`, so the own prefix never reaches a file.
 * React's ids have held characters such as `:` and `«`, which a `url(#…)`
 * would have to escape, so anything outside letters, digits, `_` and `-` is
 * dropped. The hook is called whether or not a prefix is given, as hooks
 * must be.
 */
export function useOwnIdPrefix(idPrefix: string | undefined): string {
  const own = `lts${idSafe(useId())}`;
  return idPrefix ?? own;
}
