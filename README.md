# London TypeScript logo

The visual identity of **London TypeScript**, a developer meetup community, built as a small TypeScript application that generates the logo.

The emblem descends from a Three.js sculpture of overlapping translucent blue squares, each rotating at its own speed. This project brings back that computational nature. The logo is described by parameters and pure geometry functions, drawn by React components, and exported as standalone SVG files.

> **The TypeScript source code is the design.** The SVG files in `public/assets/` are build artefacts. Never edit them by hand; change `src/logo/config.ts` and regenerate them.

## Quick start

Requires Node 22 or later.

```bash
npm install
npm run dev              # design playground at http://localhost:5173
npm run generate:assets  # regenerate public/assets/*.svg
npm test                 # unit tests (Vitest)
npm run typecheck        # strict TypeScript check
npm run build            # regenerate assets, type-check, build the playground into dist/
```

## Generated assets

| File | Contents |
| --- | --- |
| `public/assets/london-typescript-logo.svg` | Complete horizontal logo |
| `public/assets/london-typescript-mark.svg` | Emblem only |
| `public/assets/london-typescript-wordmark.svg` | Two-line wordmark only |

Each file is:

- **Static:** no JavaScript.
- **Self-contained:** glyphs are converted to outlines, so no fonts are needed.
- **Responsive:** sized only by a tight `viewBox`, so it scales to its container.
- **Deterministic:** the same configuration always produces byte-identical files.
- **Transparent:** no background, so it can sit on anything.

Each square, facet and glyph is its own element with an `lts-…` id, for example `lts-layer-3`.

## Using the playground

`npm run dev` opens a development page (not part of the eventual website) with:

- **Previews:** the complete logo on the reference's cream background, a static emblem, and an animation preview.
- **Sliders:**
  - Squares: layer count, rotation increment, initial rotation, size, size taper, corner radius, opacity.
  - TS tile: letter size, margins, letter spacing.
  - Wordmark and layout: gap, line spacing, letter spacing, flourish scale.
  - Animation: speed and speed variation.
- **Animate squares / Stop animation:** stopping glides each square back to the approved composition.
- **Toggles:** alternate rotation directions, and "multiply overlaps" (a tinted-glass blend mode).
- **Download SVG:** mark, wordmark or complete logo, built from your current slider settings with the same code as `generate:assets`. Optionally includes the cream background.
- **Reset:** restores the approved `defaultLogoConfig` and unloads any saved configuration.
- **Saved configurations:** keep named variations in this browser's localStorage.
  - **New:** starts again from the approved settings, unloading the current configuration. It asks first if there are unsaved changes.
  - **Duplicate:** saves the current settings as a new configuration named after the loaded one plus "Copy" (for example "Dense rosette Copy", then "Dense rosette Copy 2" if that name is taken) and switches to it. With nothing loaded it's called "New Config". The name opens for editing straight away; press Escape to keep it.
  - **Save as new:** stores the current settings under a name you type; that configuration is then the one being edited.
  - **Save changes:** writes the current settings back to the loaded configuration. It's enabled when there are unsaved changes.
  - **Load, Rename, Delete:** load and delete ask for confirmation when work would be lost.
  - Saved configurations from older versions still load: fields added to the config since then take their defaults.

Saved configurations live only in this browser; they aren't shared and don't change the generated assets. To make a configuration the official logo, copy its values into `defaultLogoConfig` in `src/logo/config.ts` and run `npm run generate:assets`.

## How it works

The code has four layers, each with one job:

```
config ──► GEOMETRY (pure TS) ──► model (plain data) ──► RENDERING (React → SVG)
                                       │                        │
                     ANIMATION (pure TS) rotations over time    EXPORT (renderToStaticMarkup)
```

| Layer | Where | Responsibility |
| --- | --- | --- |
| Configuration | `src/logo/config.ts` | Typed parameters and the approved defaults (`defaultLogoConfig`) |
| Geometry | `src/logo/geometry.ts`, `typography.ts` | What the shapes are and where they start |
| Animation | `src/logo/animation.ts` | How the squares' rotations change over time |
| Rendering | `src/components/` | Turns models into SVG elements; calculates nothing |
| Export | `src/components/renderSvg.tsx`, `scripts/generate-assets.ts` | The same components rendered to standalone SVG documents |
| Playground | `src/playground/` | Development UI only (including saved configurations in `presets.ts`) |

`src/logo` imports neither React nor the DOM. Its functions are deterministic, and you can use them from any renderer:

```ts
import { buildLogo, defaultLogoConfig } from './src/logo';

const logo = buildLogo(defaultLogoConfig, fonts); // LogoModel: plain data
logo.emblem.layers; // SquareLayer[]: size, rotation, cornerRadius, fill, opacity…
```

### Geometry

- **Background squares** (`generateLayers`): `layerCount` squares share a centre. Square *i* is rotated `initialRotation + i × rotationIncrement`. The approved logo uses 6 squares at 15° steps from 7.5°, which makes it mirror-symmetric. Each square is 1.45 × the tile wide, with a very small corner radius.
- **Transparency:** the squares are translucent and overlap with real alpha compositing, so the shades of blue come from the overlaps themselves and update as the squares rotate.
- **Bounds:** worked out in closed form. A rounded square rotated by θ reaches `(s/2 − r)(|cos θ| + |sin θ|) + r` from its centre. This gives a tight `viewBox` for static output, and a "rotation-safe" frame for animation so nothing clips.
- **Central tile** (`generateTile`): an opaque square with four translucent white or navy triangles meeting at an off-centre point (`facets.apexX/apexY`). This produces the folded facets without tracing anything. The facet paths follow the rounded corners exactly.
- **"TS" lettering:** set in Open Sans ExtraBold. Its cap height is `textScale` × the tile, and it's placed against the bottom-right margins (`textOffsetX/Y`).

### Typography

- **Glyphs:** fonts are parsed with [opentype.js](https://github.com/opentypejs/opentype.js). `layoutTextRun` positions glyphs using the font's kerning plus `letterSpacing` and turns each one into SVG path data. The source keeps the actual text, font and typographic parameters, never stored coordinates.
- **Wordmark font:** Playfair Display Black, the closest licensed match to the reference's high-contrast editorial serif with ball terminals.
- **Alignment:** the wordmark's font size is derived so that the top of the capital L to the baseline of "TypeScript" equals the tile height. The tile's top and bottom edges line up with the lettering at any size.
- **Flourishes:** the curl leaving the top-left of the L and the terminal on the final t come from one generator (`curlGeometry`). It offsets a cubic Bézier centreline by a swelling width and finishes with a ball. The two flourishes are mirror images.

### Animation

`src/logo/animation.ts` is pure maths:

- **`layerVelocities`:** gives every square its own deterministic speed, spread around `baseVelocity` by a golden-ratio sequence, optionally alternating direction.
- **`advanceRotations`:** integrates rotations frame by frame, so speed changes take effect smoothly.
- **`settleRotations`:** eases each square back to the nearest angle that looks identical to its static one (squares repeat every 90°). Stopping is therefore a short glide, never a jump.

`useLayerRotations` (`src/components/useLayerRotations.ts`) runs these functions on `requestAnimationFrame` and passes the rotations to the same `TypeScriptMark` / `LondonTypeScriptLogo` components used for the static logo. Rotation is an SVG `rotate()` attribute about the shared origin, not a CSS `transform-origin`, so it behaves the same in Chrome, Firefox and Safari. Animation is off for users who prefer reduced motion.

### Export

`renderLogoSvg(variant, model)` renders the components with React's `renderToStaticMarkup`. The playground's download buttons and `scripts/generate-assets.ts` both call it, so previews and files can never drift apart. `npm run build` regenerates the assets before building.

### Fonts

Both fonts are SIL Open Font License 1.1, installed from `@fontsource` and pinned by `package-lock.json`. Each environment loads the bytes its own way and hands them to `parseLogoFonts`:

- **Browser:** Vite URL imports, in `src/components/fonts.browser.ts`.
- **Node:** the file system, in `scripts/node-fonts.ts`.

## Using the components in a website

```tsx
import { LondonTypeScriptLogo, AnimatedTypeScriptMark, loadLogoFonts } from './src/components';
import { buildLogo, defaultLogoConfig } from './src/logo';

const logo = buildLogo(defaultLogoConfig, await loadLogoFonts());

<LondonTypeScriptLogo logo={logo} className="w-96" />
<AnimatedTypeScriptMark emblem={logo.emblem} animation={defaultLogoConfig.animation} />
```

For static pages, simply use the generated files in `public/assets/`.

## Tests

`npm test` covers:

- **Geometry:** layer rotations, palette cycling, size taper, the closed-form bounds and their 90° symmetry, and the rotation-safe radius.
- **Animation:** distinct deterministic speeds, integration, shortest symmetric settling, and the easing.
- **Layout:** the tile aligns with the top of "London" and the baseline of "TypeScript" at several sizes; the emblem–wordmark gap; and the flourishes mirroring each other.
- **Export:** identical output on every run; valid standalone documents with no `<text>` or images; every square present as its own element.
- **Saved configurations:** parsing corrupt storage, and merging older saved configurations with current defaults.

## Project structure

```
src/
  logo/          framework-free engine (config, geometry, typography, animation, fonts)
  components/    React renderers, animation hook, SVG export
  playground/    development UI
scripts/
  generate-assets.ts   writes public/assets/*.svg
  node-fonts.ts        loads the fonts in Node (generator and tests)
public/assets/   generated SVGs: do not edit
```
