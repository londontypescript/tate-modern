/**
 * A glyph's character as it may appear in an SVG id (`glyph-0-0-L`). Letters,
 * digits, `_` and `-` are written as they are, so every id drawn so far is
 * unchanged; any other character (a space, a quote, `<`, an accented
 * letter) is written as `u` and its code point in hex, so text typed into a
 * saved configuration can never make an id that is invalid or breaks out
 * of its attribute.
 */
export const idChar = (char: string) =>
  char.replace(/[^A-Za-z0-9_-]/gu, (c) => `u${(c.codePointAt(0) ?? 0).toString(16).padStart(4, '0')}`);
