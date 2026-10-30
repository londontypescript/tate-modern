/**
 * Pair kerning read straight from a WOFF font's GPOS table.
 *
 * **Why:** opentype.js 2.0 kerns only from GPOS pair lookups stored directly
 * in the lookup list. Exo 2 keeps most of its kerning (the "Ty" of
 * TypeScript among it) inside extension lookups (type 9), which opentype.js
 * skips, so its `getKerningValue` returns 0 where every browser kerns. This
 * reader follows the extensions, so the outlined wordmark is spaced as a
 * browser sets the same text.
 *
 * It covers what horizontal kerning needs: the `kern` feature of the `latn`
 * (else `DFLT`) script's default language, pair adjustment lookups (type 2,
 * formats 1 and 2) directly or through extensions, and the first glyph's
 * x advance. Other adjustments (placement, the second glyph's values) are
 * not read; Exo 2's kerning uses none of them.
 */

/** Kerning between two glyphs by glyph index, in font units. */
export type PairKerning = (left: number, right: number) => number;

/** Lookup types in GPOS: pair adjustment and its extension wrapper. */
const PAIR_ADJUSTMENT = 2;
const EXTENSION = 9;
/** ValueFormat flag for a value record that carries an x advance. */
const X_ADVANCE = 0x0004;

export async function readPairKerning(woff: ArrayBuffer): Promise<PairKerning> {
  const gpos = await woffTable(woff, 'GPOS');
  if (!gpos) return () => 0;
  const subtables = kernLookupIndexes(gpos).map((index) => pairSubtables(gpos, index));
  return (left, right) =>
    subtables.reduce((total, lookup) => {
      // Within one lookup the first subtable that covers the pair applies.
      for (const subtable of lookup) {
        const value = subtable(left, right);
        if (value !== undefined) return total + value;
      }
      return total;
    }, 0);
}

/** One table's bytes from a WOFF file, inflated when stored compressed. */
async function woffTable(woff: ArrayBuffer, tag: string): Promise<DataView | undefined> {
  const view = new DataView(woff);
  if (view.getUint32(0) !== 0x774f4646) throw new Error('Not a WOFF font');
  const tableCount = view.getUint16(12);
  for (let i = 0; i < tableCount; i++) {
    const entry = 44 + i * 20;
    if (tagAt(view, entry) !== tag) continue;
    const offset = view.getUint32(entry + 4);
    const stored = view.getUint32(entry + 8);
    const length = view.getUint32(entry + 12);
    const bytes = new Uint8Array(woff, offset, stored);
    if (stored === length) return new DataView(woff, offset, length);
    // WOFF compresses each table with zlib, which DecompressionStream calls
    // "deflate"; it is built into browsers and Node alike.
    const inflated = await new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')),
    ).arrayBuffer();
    if (inflated.byteLength !== length) throw new Error(`WOFF table ${tag} inflated to the wrong length`);
    return new DataView(inflated);
  }
  return undefined;
}

const tagAt = (view: DataView, offset: number) =>
  String.fromCharCode(...[0, 1, 2, 3].map((i) => view.getUint8(offset + i)));

/** The lookups the `kern` feature uses, in lookup-list order. */
function kernLookupIndexes(gpos: DataView): number[] {
  const scriptList = gpos.getUint16(4);
  const featureList = gpos.getUint16(6);
  const scripts = new Map<string, number>();
  for (let i = 0; i < gpos.getUint16(scriptList); i++) {
    const record = scriptList + 2 + i * 6;
    scripts.set(tagAt(gpos, record), scriptList + gpos.getUint16(record + 4));
  }
  const script = scripts.get('latn') ?? scripts.get('DFLT');
  const langSys = script === undefined ? 0 : gpos.getUint16(script);
  if (script === undefined || langSys === 0) return [];
  const lang = script + langSys;
  const features = [gpos.getUint16(lang + 2)];
  for (let i = 0; i < gpos.getUint16(lang + 4); i++) features.push(gpos.getUint16(lang + 6 + i * 2));

  const lookups = new Set<number>();
  for (const index of features) {
    if (index === 0xffff) continue;
    const record = featureList + 2 + index * 6;
    if (tagAt(gpos, record) !== 'kern') continue;
    const feature = featureList + gpos.getUint16(record + 4);
    for (let i = 0; i < gpos.getUint16(feature + 2); i++) lookups.add(gpos.getUint16(feature + 4 + i * 2));
  }
  return [...lookups].sort((a, b) => a - b);
}

type Subtable = (left: number, right: number) => number | undefined;

/** A lookup's pair subtables, extensions unwrapped; others are skipped. */
function pairSubtables(gpos: DataView, index: number): Subtable[] {
  const lookupList = gpos.getUint16(8);
  const lookup = lookupList + gpos.getUint16(lookupList + 2 + index * 2);
  const type = gpos.getUint16(lookup);
  const subtables: Subtable[] = [];
  for (let i = 0; i < gpos.getUint16(lookup + 4); i++) {
    let subtable = lookup + gpos.getUint16(lookup + 6 + i * 2);
    let subtableType = type;
    if (type === EXTENSION) {
      subtableType = gpos.getUint16(subtable + 2);
      subtable += gpos.getUint32(subtable + 4);
    }
    if (subtableType === PAIR_ADJUSTMENT) subtables.push(pairSubtable(gpos, subtable));
  }
  return subtables;
}

function pairSubtable(gpos: DataView, at: number): Subtable {
  const u16 = (offset: number) => gpos.getUint16(offset);
  const format = u16(at);
  const covered = coverage(gpos, at + u16(at + 2));
  const format1 = u16(at + 4);
  const valueSize = (valueFormat: number) => 2 * popCount(valueFormat & 0xff);
  const recordValues = valueSize(format1) + valueSize(u16(at + 6));
  // x advance follows x and y placement when they are present.
  const xAdvance = (values: number) =>
    format1 & X_ADVANCE ? gpos.getInt16(values + 2 * popCount(format1 & (X_ADVANCE - 1))) : 0;

  if (format === 1) {
    return (left, right) => {
      const index = covered.get(left);
      if (index === undefined) return undefined;
      const pairSet = at + u16(at + 10 + index * 2);
      for (let i = 0; i < u16(pairSet); i++) {
        const record = pairSet + 2 + i * (2 + recordValues);
        if (u16(record) === right) return xAdvance(record + 2);
      }
      return undefined;
    };
  }
  if (format !== 2) return () => undefined;
  const classes1 = classDef(gpos, at + u16(at + 8));
  const classes2 = classDef(gpos, at + u16(at + 10));
  const class1Count = u16(at + 12);
  const class2Count = u16(at + 14);
  return (left, right) => {
    if (!covered.has(left)) return undefined;
    const class1 = classes1.get(left) ?? 0;
    const class2 = classes2.get(right) ?? 0;
    // A class past the matrix is a broken font; read nothing rather than another record.
    if (class1 >= class1Count || class2 >= class2Count) return 0;
    return xAdvance(at + 16 + (class1 * class2Count + class2) * recordValues);
  };
}

const popCount = (bits: number) => bits.toString(2).replaceAll('0', '').length;

/** Coverage table: glyph index to coverage index. */
function coverage(gpos: DataView, at: number): Map<number, number> {
  const map = new Map<number, number>();
  const count = gpos.getUint16(at + 2);
  for (let i = 0; i < count; i++) {
    if (gpos.getUint16(at) === 1) {
      map.set(gpos.getUint16(at + 4 + i * 2), i);
      continue;
    }
    const range = at + 4 + i * 6;
    const start = gpos.getUint16(range);
    for (let glyph = start; glyph <= gpos.getUint16(range + 2); glyph++)
      map.set(glyph, gpos.getUint16(range + 4) + glyph - start);
  }
  return map;
}

/** Class definition table: glyph index to class (absent means class 0). */
function classDef(gpos: DataView, at: number): Map<number, number> {
  const map = new Map<number, number>();
  if (gpos.getUint16(at) === 1) {
    const start = gpos.getUint16(at + 2);
    for (let i = 0; i < gpos.getUint16(at + 4); i++) map.set(start + i, gpos.getUint16(at + 6 + i * 2));
    return map;
  }
  for (let i = 0; i < gpos.getUint16(at + 2); i++) {
    const range = at + 4 + i * 6;
    for (let glyph = gpos.getUint16(range); glyph <= gpos.getUint16(range + 2); glyph++)
      map.set(glyph, gpos.getUint16(range + 4));
  }
  return map;
}
