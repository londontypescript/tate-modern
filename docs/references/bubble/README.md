# The bubble logo: reference

The canonical drawing of the London TypeScript bubble logo, frozen from the 29 October 2026 exploration so the
TypeScript version can be judged against committed files. [ADR 0004](../../adr/0004-the-bubble-is-the-logo.md) made
it the logo. The SVGs are the source of truth; the PNGs are rendered from them.

| Light                                         | Dark                                         |
| --------------------------------------------- | -------------------------------------------- |
| ![Light emblem](emblem-light-240.png)         | ![Dark emblem](emblem-dark-240.png)          |
| [`emblem-light.svg`](emblem-light.svg)        | [`emblem-dark.svg`](emblem-dark.svg)         |
| `emblem-light-56.png`, `-240.png`, `-480.png` | `emblem-dark-56.png`, `-240.png`, `-480.png` |

The PNGs have transparent backgrounds. The dark one is drawn for a dark page (the exploration used GitHub's dark
`#0d1117`), and its white ground shadow and glass don't show on white.

## Source

- **Exploration:** `.temple-bar/explorations/2026-10-29-cartoon-logos/` in the main checkout, gitignored.
  - `emblems.mjs`: the `panes` emblem ("1 · Sunset panes") and the `bubble()` wrapper; the logo is `bubble-panes`.
  - `lockup.mjs`: the light and dark lockup (`node lockup.mjs` writes `lockup.html`).
- **Light** is the bubble as `emblems.mjs` draws it, with `--lightglass: 1; --core: .9; --darkshadow: 0`.
- **Dark** is as `lockup.mjs`'s dark panels set it: `--lightglass: 0; --core: .9; --darkshadow: 1`.

## How the files were made

A throwaway script, not committed, kept beside the exploration in the main checkout's gitignored
`.temple-bar/explorations/2026-10-30-bubble-reference/` (`derive.mjs` makes the SVGs, `render.mjs` the PNGs and
bounds, `compare.mjs` the browser comparison page). Compared with the exploration's own markup, it:

- **inlines the panes** in place of `<use href="#panes">` (the symbol's viewBox and the use's size are both 240, so
  no extra transform);
- **resolves the custom properties:** `--core` becomes `transform="translate(120 120) scale(0.9) translate(-120 -120)"`;
  layers a theme switches on lose their `opacity: var(…)` style, and layers it switches off are left out, rather than
  kept at opacity 0;
- **drops definitions nothing refers to** after that (dark has no `lightBody` or `edge` gradient);
- **prefixes every id** with `lts-bubble-light-` or `lts-bubble-dark-`, so both files can sit inline in one page;
- **outlines "TS"** as a path from the Open Sans 800 font file (below), instead of live `<text>`;
- adds `xmlns`, a 240 × 240 size and a `<title>`.

Each SVG is self-contained: no `<use>`, no CSS, no custom properties, no fonts, no outside references. It shows the
same as an `<img>`, inline, or rendered by resvg.

**Why TS is outlined:** `@fontsource` ships only WOFF and WOFF2, and resvg can't read either (its font loader rejects
the WOFF as malformed), so live text would render nothing. The repo already outlines its lettering with opentype.js
for the same reason (`src/shared/fonts.ts`).

## Dimensions

- **Size and viewBox:** `width="240" height="240" viewBox="0 0 240 240"`.
- **Sphere:** centre (120, 120), radius 112; with the outer rim stroke, it spans 7.5 to 232.5 on both axes.
- **Painted bounds** (alpha above 0, measured with resvg at 4 px per unit and the box opened out): x 7.5 to 232.5,
  y 7.5 to about 246, in both themes. The ground shadow's blur reaches past the 240 box at the bottom, and the box
  clips it, as the exploration's 240 symbol did. Without the blur the shadow's ellipse spans x 48 to 192, y 223 to 237.

## The emblem: values

The panes emblem is drawn in its own 240 box, then scaled by 0.9 about (120, 120) inside the bubble.

**Panes**, painted in this order, each `<rect x="60" y="60" width="120" height="120" rx="14">` rotated about
(120, 120), each filled with a diagonal gradient (`x1=0 y1=0 x2=1 y2=1`) from its colour to the same colour at
opacity .82:

| Pane | Rotation | Colour            |
| ---- | -------- | ----------------- |
| 1    | −60°     | plum `#2d1650`    |
| 2    | −46°     | magenta `#8a2f6e` |
| 3    | −32°     | pink `#ff5fa2`    |
| 4    | −18°     | orange `#ff9a5c`  |
| 5    | −6°      | gold `#ffcf7a`    |

**Tile:** `<rect x="62" y="62" width="116" height="116" rx="14">`, diagonal gradient `#3d8bff` to `#1275ec`. The same
in both themes.

**Gloss:** `M70,70 h60 l-60,30 Z`, white at opacity .18.

**TS:** Open Sans ExtraBold (800), size 52, baseline y 168, centred on x 145 (`text-anchor="middle"`), letter spacing
−2, white. Advances: T 1210, S 1182 (units per em 2048); no kerning between them. Browsers add the letter spacing
after each glyph, the last included, and centre on that advance, so the run is 56.734 wide and starts at x 116.633;
Chrome reports the same start (116.633) for the exploration's live text. Path data is rounded to 2 decimals.

## The bubble: values

Painted in this order. "Blur" is `feGaussianBlur`; the shadow's filter region is x −50%, y −200%, width 200%,
height 500%, and the soft blur's is −20% / 140% on both axes.

| #   | Layer            | Themes | Drawing                                                                                                                                                                 |
| --- | ---------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Ground shadow    | light  | ellipse (120, 230) rx 72 ry 7, `#1b2a4a` at .22, blur 4                                                                                                                 |
| 2   | Glass body       | light  | circle r 112, radial (cx .4, cy .35, r .65): 0 `#ffffff` 0, .55 `#e6effc` .35, .85 `#c4d7f2` .55, 1 `#9db6dc` .7                                                        |
| 3   | Ground shadow    | dark   | the same ellipse, `#ffffff` at .2, blur 4                                                                                                                               |
| 4   | Tint             | both   | circle r 112, `#9cc8ff` at .08                                                                                                                                          |
| 5   | Core             | both   | the panes emblem, scaled 0.9 about (120, 120)                                                                                                                           |
| 6   | Body             | both   | circle r 112, radial (cx .5, cy .5, r .5): .62 `#ffffff` 0, .9 `#bcd8ff` .16, 1 `#ffffff` .42                                                                           |
| 7   | Edge             | light  | circle r 112, radial (.5, .5, .5): .78 `#3d5a8a` 0, .95 `#3d5a8a` .2, 1 `#2a3f66` .38                                                                                   |
| 8   | Inner shade      | light  | `M196,92 A84,84 0 0 1 110,204`, stroke `#2a3f66` at .14, width 10, blur 2.2                                                                                             |
| 9   | Rainbow sheen    | both   | clipped to r 112: circle r 107, stroke width 10 at .5, blur 2.2, diagonal gradient 0 `#ff5fa2`, .22 `#ffcf7a`, .42 `#7dffb0`, .62 `#5cd6ff`, .82 `#9a7dff`, 1 `#ff5fa2` |
| 10  | Lower reflection | both   | clipped to r 112: `M48,150 A80,80 0 0 0 192,150`, stroke white at .28, width 5, blur 2.2                                                                                |
| 11  | Rim              | both   | circle r 111, stroke white at .75, width 1.6; circle r 112, stroke `#7aa8e0` at .35, width 1                                                                            |
| 12  | Shine            | both   | `M40,96 C46,62 72,36 108,30 C78,44 58,68 52,100 Z`, radial (cx .35, cy .25, r .6): white .85 to white 0                                                                 |
| 13  | Windows          | both   | rect (62, 44) 16 × 22 rx 4 rotated −32° about (70, 55), white .7; rect (82, 34) 12 × 17 rx 3 rotated −22° about (88, 42), white .55                                     |
| 14  | Glint            | both   | circle (176, 182) r 5, white at .55                                                                                                                                     |
| 15  | Outlines         | light  | stroke `#7f9fd0` at .6, width 1: circle r 111.4 (width 1.4), both windows, and the shine's outer edge `M40,96 C46,62 72,36 108,30` at .35                               |

## The lockup

Not captured here: Exo 2 isn't a dependency until P3 (#57), and the exploration loaded it from Google Fonts with no
version. Its layout, from `lockup.mjs` and the 0.5.0 plan:

- **Font:** Exo 2, weight 700, unmodified letterforms.
- **Layout:** stacked and left-aligned, the emblem then the words, centred vertically (`align-items: center`). Line
  one "London" in ink; line two "Type" in ink and "Script" in blue, upright.
- **Text size:** 0.4 of the emblem's size. In `lockup.mjs` that is 0.4 of the emblem's 240 box as drawn (a 56 px box
  gives 22.4 px text), not of the sphere, which is 224/240 of the box.
- **Gap:** 10 px at a 56 px emblem. **Line height:** 1.05.
- **Colours:** light ink `#1f2328`, blue `#1275ec`; dark ink `#f0f6fc` (GitHub's near-white), blue lifted to
  `#3d8bff`.

## Versions

- Open Sans ExtraBold, "Version 3.003", from `@fontsource/open-sans` 5.3.0:
  `files/open-sans-latin-800-normal.woff`, SHA-256
  `96e3d0d0231baf627ba0db09a7c4310142f40d81c9e1d4af6be13a3aa9b4270b`. Outlined with opentype.js 2.0.0.
- PNGs: `@resvg/resvg-js` 2.6.2, `fitTo` width 56, 240 and 480, no fonts loaded (the TS is already a path).
- Exo 2: not used here.

## Checked against the exploration

Compared at 960 px in Chrome (the desktop app's browser), the exploration's own markup (its sprite, the CSS custom
properties and the Open Sans 800 font, as `lockup.mjs` sets them up) against the reference SVG and the resvg PNG, on
white and on `#0d1117`:

- **Exploration and reference SVG:** pixels differ only in the TS. Placement matches to the pixel; the differences are
  edge anti-aliasing (Chrome's text rasteriser against a filled path). Mean difference 0.11 of 255.
- **Exploration and resvg PNG:** 99.5% of pixels within 8 of 255; the rest are the TS's edges and faint noise in the
  blurred layers, where the two renderers' blurs differ slightly. Mean difference about 1 of 255.

No difference is visible side by side at 240 px.
