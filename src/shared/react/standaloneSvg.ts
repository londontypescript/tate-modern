import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sha256Hex } from '../sha256';

/**
 * Every exported SVG document, from every concept, is written here, so its
 * ids are settled in one place.
 *
 * **Why:** an SVG pasted inline into an HTML page shares the page's ids. Two
 * different logos exported with the same fixed prefix would then paint with
 * each other's gradients and masks, and their shapes would clash too.
 *
 * **How:** the document is drawn once with the fixed placeholder prefix
 * `lts`, and that markup is hashed together with `kind` (the concept and
 * variant, such as `flat/mark`). The document is then drawn again with
 * `lts-` and the first 32 hex digits (128 bits) of that hash as its prefix.
 * Hashing the finished file instead would be circular, since its ids are
 * part of it.
 *
 * **The contract:**
 * - Every id in the document carries the prefix (shapes, groups, glyphs,
 *   gradients, masks), and so does every `url(#…)` that points at one: the
 *   renderers build all of them from the one `idPrefix` they are given.
 * - The same content and kind always give the same, byte-identical file, so
 *   regenerating the assets twice gives no diff; the studio's download and
 *   `pnpm generate:assets` go through this same function.
 * - Different content, or a different variant of the same design, gives a
 *   different prefix. Anything that changes the drawing (the background
 *   included) changes the placeholder markup, so changes the hash.
 * - The hash is SHA-256 of the UTF-8 text, synchronous, and runs the same in
 *   the browser and in Node (see `sha256Hex`), so exports stay synchronous.
 * - Two inline copies of the *same* file still share ids: no prefix written
 *   into a file can tell its copies apart.
 *
 * `idPrefix` skips the hash and uses that prefix as given. It exists for the
 * historical fixtures, which were written with the fixed `lts` and must never
 * be regenerated.
 */
export function standaloneSvg(kind: string, draw: (idPrefix: string) => ReactElement, idPrefix?: string) {
  if (idPrefix !== undefined) {
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(idPrefix)) throw new Error(`Not a usable id prefix: ${idPrefix}`);
    return asDocument(draw(idPrefix));
  }
  return asDocument(draw(contentIdPrefix(kind, asDocument(draw(placeholderPrefix)))));
}

/** The prefix the first drawing is made with, before the content is known. */
const placeholderPrefix = 'lts';

/** `lts-` and 128 bits of the hash of the kind and the placeholder drawing. */
const contentIdPrefix = (kind: string, placeholderMarkup: string) =>
  `lts-${sha256Hex(`${kind}\n${placeholderMarkup}`).slice(0, 32)}`;

const asDocument = (element: ReactElement) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n${renderToStaticMarkup(element)}\n`;
