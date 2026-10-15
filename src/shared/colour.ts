/**
 * Whether a saved value is a colour the logo may write: `#` and six hex
 * digits, either case, and nothing else around it. It is the only form the
 * palette, the starters and a colour input produce, so any other string (a
 * colour name, three digits, `url(#…)`, text that would close the attribute)
 * is refused rather than repaired.
 */
export const isHexColour = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
