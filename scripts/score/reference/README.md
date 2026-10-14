# The score's reference

What `pnpm score` compares candidates against: the ChatGPT original's mark (`public/references/chatgpt-original.webp`,
1808 × 870, lossy WebP, SHA-256 `ba40741dc3bf5f4251199020ac606edf6ab8320144558c37f68505430eaf6669`) decoded once into
lossless files. Tests read only these files.

- **`mark.png`** (1120 × 1120, 8-bit RGB): the original's pixels from x 0–807 and y 0–869 (the whole height, and
  everything left of the wordmark, which starts at x 816), copied unchanged to (131, 121) on a canvas filled with the
  background colour. The canvas is larger than the crop so a candidate a little bigger than the original isn't clipped:
  the Irregular starter's sheets reach 883 px across at the registered scale, beyond the original's own width
  available before the wordmark. The tile's centre lands near the canvas's centre.
- **`regions.png`** (same size, exact colours): background `#000000`, sheets `#ff0000`, tile `#0000ff`. The tile is
  every pixel whose centre lies inside the measured tile (lettering and facets included). Sheets are the other pixels
  whose CIEDE2000 distance from the background colour exceeds 2.0, with the 133 cream pixels they enclose filled in.
  Nothing else was cleaned: every pixel over the threshold outside the main body lies along the emblem's outer edge
  (none is out in the cream), so each counts as a faint sheet edge.
- **`registration.json`**: the canvas, the crop and where it sits, the background colour, the tile's measured bounds
  in the canvas, its centre, the registered side (the geometric mean of the measured width and height) and the
  residual (how far each edge of that square falls inside the measured tile, per axis; negative is outside).

## The background

`#fef7ea` (254, 247, 234): the most common colour in a 16 × 16 patch at each corner of the crop. It isn't perfectly
uniform: the WebP's compression leaves blocks of `253, 248, 234` and a few other near neighbours, at most 1.196
CIEDE2000 from it (recorded as `backgroundSpread`), all under the 2.0 threshold.

## The tile

Each edge is measured along several profiles clear of the lettering and the facets' corners (rows 330, 360, 390, 420
and 450 of the original for the left and right edges; columns 300, 330, 350 and 380 for the top and bottom), to a
fraction of a pixel: the levels either side are read 3 to 5 pixels away, in the channel with the most contrast, and
the pixels within 2 of the edge count by the share the tile covers. Each edge is the mean of its profiles. The
original's tile is wider than tall (about 339 × 308 px), so the registered square misses by about 8 px on each side
across and down.

## Remaking it

Tools: `dwebp` 1.6.0 (libwebp, Homebrew) and Node 24.

```sh
dwebp public/references/chatgpt-original.webp -o /tmp/chatgpt-original.png
pnpm score --make-reference /tmp/chatgpt-original.png
pnpm exec prettier --write scripts/score/reference/registration.json
```

`scripts/score/referenceMake.ts` holds every step and constant. A test checks that the committed mask and tile
measurement still follow exactly from the committed `mark.png`.
