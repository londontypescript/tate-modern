/**
 * How the committed reference was made from the ChatGPT original, kept as
 * code so it can be remade exactly (`pnpm score --make-reference`, see
 * reference/README.md) and so a test can check the committed mask and
 * registration still follow from the committed crop.
 */
import { ciede2000, srgbToLab } from './colour';
import type { RgbImage } from './image';
import { isForeground, regionColours, type Rect, type Registration } from './reference';

type Rgb = readonly [number, number, number];

/** The original's pixels that hold the mark and none of the wordmark (which starts at x = 816). */
const SOURCE_CROP: Rect = { x: 0, y: 0, width: 808, height: 870 };

/**
 * The canvas: the crop placed at `CROP_AT` on a larger field of the
 * background colour, so a candidate a little bigger than the original
 * (the Irregular starter reaches 883 px across) isn't clipped.
 */
const CANVAS = { width: 1120, height: 1120 } as const;
const CROP_AT = { x: 131, y: 121 } as const;

const pixel = (image: RgbImage, x: number, y: number): Rgb => {
  const i = (y * image.width + x) * 3;
  return [image.data[i] ?? 0, image.data[i + 1] ?? 0, image.data[i + 2] ?? 0];
};

/**
 * The background: the most common colour in a `patch`-pixel square at each
 * corner of `area`, and the largest CIEDE2000 distance of any sampled pixel
 * from it (how far from uniform the background is).
 */
export function sampleBackground(image: RgbImage, area: Rect, patch: number) {
  const samples: Rgb[] = [];
  for (const [cx, cy] of [
    [area.x, area.y],
    [area.x + area.width - patch, area.y],
    [area.x, area.y + area.height - patch],
    [area.x + area.width - patch, area.y + area.height - patch],
  ] as const) {
    for (let y = cy; y < cy + patch; y++) for (let x = cx; x < cx + patch; x++) samples.push(pixel(image, x, y));
  }
  const counts = new Map<string, number>();
  for (const s of samples) counts.set(s.join(','), (counts.get(s.join(',')) ?? 0) + 1);
  const [mode] = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0] ?? ['0,0,0'];
  const colour = mode.split(',').map(Number) as unknown as Rgb;
  const lab = srgbToLab(...colour);
  const spread = Math.max(...samples.map((s) => ciede2000(lab, srgbToLab(...s))));
  return { colour, spread, samples: samples.length };
}

/**
 * Where an edge lies along a profile, to a fraction of a pixel. `near` is
 * the index of a pixel at the edge; the tile lies `after` it (a left or top
 * edge) or `before` it. The levels either side are the means of the pixels
 * 3 to 5 away; the channel with the most contrast between them is read, and
 * each pixel within 2 of `near` counts by the share of it the tile covers.
 */
export function edgePosition(profile: readonly Rgb[], near: number, tile: 'after' | 'before'): number {
  const mean = (from: number, to: number, c: number) => {
    let sum = 0;
    for (let i = from; i <= to; i++) sum += profile[i]?.[c] ?? 0;
    return sum / (to - from + 1);
  };
  const levels = [0, 1, 2].map((c) => {
    const before = mean(near - 5, near - 3, c);
    const after = mean(near + 3, near + 5, c);
    return tile === 'after' ? { c, inside: after, outside: before } : { c, inside: before, outside: after };
  });
  const { c, inside, outside } = levels.reduce((best, l) =>
    Math.abs(l.inside - l.outside) > Math.abs(best.inside - best.outside) ? l : best,
  );
  let covered = 0;
  for (let i = near - 2; i <= near + 2; i++) {
    const share = ((profile[i]?.[c] ?? 0) - outside) / (inside - outside);
    covered += Math.min(Math.max(share, 0), 1);
  }
  // Five pixels from near - 2: the tile covers `covered` of them, on its own side.
  return tile === 'after' ? near - 2 + (5 - covered) : near - 2 + covered;
}

/**
 * The profiles the tile's edges were measured along, in the original's
 * pixels: rows for the left and right edges, columns for the top and bottom,
 * each clear of the lettering and the facets' corners, with the pixel each
 * edge was seen to cross.
 */
const TILE_PROFILES = {
  rows: [330, 360, 390, 420, 450],
  columns: [300, 330, 350, 380],
  near: { left: 259, right: 598, top: 285, bottom: 593 },
} as const;

/** The tile's bounds in the canvas, each edge the mean of its profiles. */
export function measureTile(mark: RgbImage): Rect {
  const dx = CROP_AT.x - SOURCE_CROP.x;
  const dy = CROP_AT.y - SOURCE_CROP.y;
  const row = (y: number) => Array.from({ length: mark.width }, (_, x) => pixel(mark, x, y + dy));
  const column = (x: number) => Array.from({ length: mark.height }, (_, y) => pixel(mark, x + dx, y));
  const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const { near } = TILE_PROFILES;
  const left = average(TILE_PROFILES.rows.map((y) => edgePosition(row(y), near.left + dx, 'after')));
  const right = average(TILE_PROFILES.rows.map((y) => edgePosition(row(y), near.right + dx, 'before')));
  const top = average(TILE_PROFILES.columns.map((x) => edgePosition(column(x), near.top + dy, 'after')));
  const bottom = average(TILE_PROFILES.columns.map((x) => edgePosition(column(x), near.bottom + dy, 'before')));
  const round = (v: number) => Number(v.toFixed(3));
  return { x: round(left), y: round(top), width: round(right - left), height: round(bottom - top) };
}

/** The mark: the source crop on a canvas of the background colour. */
function placeCrop(source: RgbImage, background: Rgb): RgbImage {
  const data = new Uint8Array(CANVAS.width * CANVAS.height * 3);
  for (let i = 0; i < data.length; i += 3) data.set(background, i);
  for (let y = 0; y < SOURCE_CROP.height; y++) {
    const from = ((SOURCE_CROP.y + y) * source.width + SOURCE_CROP.x) * 3;
    data.set(
      source.data.subarray(from, from + SOURCE_CROP.width * 3),
      ((CROP_AT.y + y) * CANVAS.width + CROP_AT.x) * 3,
    );
  }
  return { ...CANVAS, data };
}

const neighbours = (i: number, width: number, height: number) => {
  const x = i % width;
  const out: number[] = [];
  if (x > 0) out.push(i - 1);
  if (x < width - 1) out.push(i + 1);
  if (i >= width) out.push(i - width);
  if (i < width * (height - 1)) out.push(i + width);
  return out;
};

/** Labels the 4-connected components of the pixels where `mask` equals `value`. */
function components(mask: Uint8Array, width: number, height: number, value: number) {
  const label = new Int32Array(mask.length).fill(-1);
  const touchesBorder: boolean[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (mask[start] !== value || label[start] !== -1) continue;
    const id = touchesBorder.length;
    let border = false;
    const stack = [start];
    label[start] = id;
    while (stack.length > 0) {
      const i = stack.pop() as number;
      const x = i % width;
      if (x === 0 || x === width - 1 || i < width || i >= width * (height - 1)) border = true;
      for (const n of neighbours(i, width, height)) {
        if (mask[n] === value && label[n] === -1) {
          label[n] = id;
          stack.push(n);
        }
      }
    }
    touchesBorder.push(border);
  }
  return { label, touchesBorder };
}

/** Sets every background pixel (0) that the foreground encloses (not reaching the border). */
export function fillHoles(mask: Uint8Array, width: number, height: number): Uint8Array {
  const { label, touchesBorder } = components(mask, width, height, 0);
  return mask.map((v, i) => (v === 0 && !touchesBorder[label[i] as number] ? 1 : v));
}

/**
 * The regions image: the tile is every pixel whose centre lies inside the
 * measured tile; sheets are the other pixels further than the foreground
 * threshold from the background, with any cream they enclose filled in;
 * the rest is background. Nothing else is cleaned: every speck over the
 * threshold lies along the emblem's outer edges (none is out in the cream),
 * so each is a faint sheet edge the brief counts as sheets.
 */
export function buildRegions(mark: RgbImage, registration: Registration): RgbImage {
  const { width, height } = mark;
  const background = srgbToLab(...registration.background);
  const t = registration.tile;
  const inTile = (i: number) => {
    const cx = (i % width) + 0.5;
    const cy = Math.floor(i / width) + 0.5;
    return cx >= t.x && cx < t.x + t.width && cy >= t.y && cy < t.y + t.height;
  };
  const raw = new Uint8Array(width * height);
  for (let i = 0; i < raw.length; i++) {
    const [r, g, b] = [mark.data[i * 3] ?? 0, mark.data[i * 3 + 1] ?? 0, mark.data[i * 3 + 2] ?? 0];
    raw[i] = inTile(i) || isForeground(ciede2000(background, srgbToLab(r, g, b))) ? 1 : 0;
  }
  const cleaned = fillHoles(raw, width, height);
  const data = new Uint8Array(width * height * 3);
  for (let i = 0; i < cleaned.length; i++) {
    const colour = inTile(i) ? regionColours.tile : cleaned[i] ? regionColours.sheets : regionColours.background;
    data.set(colour, i * 3);
  }
  return { width, height, data };
}

/** The decoded original's size (public/references/chatgpt-original.webp). */
const ORIGINAL_SIZE = { width: 1808, height: 870 } as const;

/** Everything the reference needs, from the decoded original. */
export function makeReference(original: RgbImage) {
  if (original.width !== ORIGINAL_SIZE.width || original.height !== ORIGINAL_SIZE.height) {
    throw new Error(
      `the decoded original: expected ${ORIGINAL_SIZE.width} × ${ORIGINAL_SIZE.height}, got ${original.width} × ${original.height}`,
    );
  }
  const sampled = sampleBackground(original, SOURCE_CROP, 16);
  const mark = placeCrop(original, sampled.colour);
  const tile = measureTile(mark);
  const side = Math.sqrt(tile.width * tile.height);
  const round = (v: number) => Number(v.toFixed(3));
  const hex = `#${sampled.colour.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  const last = (start: number, length: number) => start + length - 1;
  const registration: Registration = {
    note:
      `The canvas is the original's pixels x ${SOURCE_CROP.x}–${last(SOURCE_CROP.x, SOURCE_CROP.width)}, ` +
      `y ${SOURCE_CROP.y}–${last(SOURCE_CROP.y, SOURCE_CROP.height)}, copied unchanged to (${CROP_AT.x}, ${CROP_AT.y}) ` +
      `on flat ${hex}; spill in that padding is measured against the flat colour.`,
    canvas: { ...CANVAS },
    sourceCrop: { ...SOURCE_CROP },
    cropAt: { ...CROP_AT },
    background: [...sampled.colour],
    backgroundSpread: round(sampled.spread),
    tile,
    centre: { x: round(tile.x + tile.width / 2), y: round(tile.y + tile.height / 2) },
    side: round(side),
    // How far each edge of the registered square misses the measured one (positive: the square is inside).
    residual: { x: round((tile.width - side) / 2), y: round((tile.height - side) / 2) },
  };
  return { mark, registration, regions: buildRegions(mark, registration) };
}
