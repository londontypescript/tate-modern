# LTS Design Studio

The design studio for **London TypeScript**, a developer meetup community: a small TypeScript application in which the identity is described by parameters and code, explored side by side, and exported for the website, GitHub and events.

The emblem descends from a Three.js sculpture of bevelled translucent blue slabs, fanned behind a "Ts" tile and lit from one side. The studio explores that idea as several **concepts**, each its own renderer, all sharing one palette and one wordmark:

| Concept | What it is | Status |
| --- | --- | --- |
| **Flat** (`src/concepts/flat`) | Translucent squares rotated about a faceted tile: pure 2D SVG. The first MVP, refined against the ChatGPT original. | Working; produces `public/assets/` |

> **The TypeScript source code is the design.** The SVG files in `public/assets/` are build artefacts. Never edit them by hand; change the configuration (for the flat concept, `src/concepts/flat/engine/config.ts`) and regenerate them.

## Quick start

Requires Node 22 or later.

```bash
npm install
npm run dev              # the studio at http://localhost:5173
npm run generate:assets  # regenerate public/assets/*.svg
npm test                 # unit tests (Vitest)
npm run typecheck        # strict TypeScript check
npm run build            # regenerate assets, type-check, build the studio into dist/
```

## Generated assets

The flat concept's approved configuration is exported as:


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

## Using the studio

`npm run dev` opens the studio (a development tool, not part of the eventual website):

- **Concept switcher:** the tabs in the header. The open concept is kept in the URL hash (for example `#flat`), so reloads and links keep it. Concepts load on demand.
- **Compare with a reference:** shows one of the reference images in `public/references/` beside the previews: the ChatGPT original, the two Three.js concepts and the flat MVP export. The choice is remembered in this browser.

The flat concept has:

- **Previews:** the complete logo on the reference's cream background, a static emblem, and an animation preview.
- **Sliders:**
  - Squares: layer count, rotation increment, initial rotation, size, size taper, corner radius, opacity, and the fade across each square (strength, turn per square, first direction).
  - TS tile: letter size, margins, letter spacing.
  - Wordmark and layout: gap, line spacing, letter spacing, condense letters, flourish scale.
  - Animation: speed and speed variation.
- **Animate squares / Stop animation:** stopping glides each square back to the approved composition.
- **Toggles:** alternate rotation directions, and "multiply overlaps" (a tinted-glass blend mode).
- **Download SVG:** mark, wordmark or complete logo, built from your current slider settings with the same code as `generate:assets`. Optionally includes the cream background.
- **Reset:** restores the approved `defaultLogoConfig` and unloads any saved configuration.
- **Saved configurations:** keep named variations in this browser's localStorage, one list per concept.
  - **Start from:** read-only starting points the concept ships with. The flat concept has its current defaults and the MVP exactly as approved on 11 October 2026, before the comparison fixes.
  - **New:** starts again from the approved settings, unloading the current configuration. It asks first if there are unsaved changes.
  - **Duplicate:** saves the current settings as a new configuration named after the loaded one plus "Copy" (for example "Dense rosette Copy", then "Dense rosette Copy 2" if that name is taken) and switches to it. With nothing loaded it's called "New Config". The name opens for editing straight away; press Escape to keep it.
  - **Save as new:** stores the current settings under a name you type; that configuration is then the one being edited.
  - **Save changes:** writes the current settings back to the loaded configuration. It's enabled when there are unsaved changes.
  - **Load, Rename, Delete:** load and delete ask for confirmation when work would be lost.
  - Saved configurations from older versions still load: fields added to the config since then take their defaults.

Saved configurations live only in this browser; they aren't shared and don't change the generated assets. To make a configuration the official logo, copy its values into `defaultLogoConfig` in `src/concepts/flat/engine/config.ts` and run `npm run generate:assets`. (Flat configurations saved in the original playground still load: the storage key is unchanged.)

## How it works

The code is split three ways:

- **`src/shared/`:** what every concept uses. The palette, font loading, typography (glyph layout and flourishes) and the wordmark, including `placeWordmark`, which sets it beside any emblem for a horizontal lockup. Framework-free, with React pieces (the SVG frame, the wordmark renderer, font loading in the browser, the reduced-motion preference) in `src/shared/react/`.
- **`src/concepts/<name>/`:** each concept's own engine, renderers and controls, and a default-exported studio page.
- **`src/studio/`:** the shell. The concept registry (`concepts.ts`), the switcher, the shared two-column layout, reference comparison, saved configurations and UI building blocks.

To add a concept, create `src/concepts/<name>/`, export a page component that renders `<StudioLayout previews={…} controls={…} />`, and register it in `src/studio/concepts.ts`.

### The flat concept

Its code has four layers, each with one job:

```
config ──► GEOMETRY (pure TS) ──► model (plain data) ──► RENDERING (React → SVG)
                                       │                        │
                     ANIMATION (pure TS) rotations over time    EXPORT (renderToStaticMarkup)
```

| Layer | Where | Responsibility |
| --- | --- | --- |
| Configuration | `engine/config.ts` | Typed parameters and the approved defaults (`defaultLogoConfig`) |
| Geometry | `engine/geometry.ts` (plus `src/shared/wordmark.ts`, `typography.ts`) | What the shapes are and where they start |
| Animation | `engine/animation.ts` | How the squares' rotations change over time |
| Rendering | `components/` | Turns models into SVG elements; calculates nothing |
| Export | `components/renderSvg.tsx`, `scripts/generate-assets.ts` | The same components rendered to standalone SVG documents |
| Studio page | `FlatStudio.tsx`, `controls.ts`, `starters.ts` | Development UI only |

`engine/` imports neither React nor the DOM. Its functions are deterministic, and you can use them from any renderer:

```ts
import { buildLogo, defaultLogoConfig } from './src/concepts/flat/engine';

const logo = buildLogo(defaultLogoConfig, fonts); // LogoModel: plain data
logo.emblem.layers; // SquareLayer[]: size, rotation, cornerRadius, fill, opacity…
```

#### Geometry

- **Background squares** (`generateLayers`): `layerCount` squares share a centre. Square *i* is rotated `initialRotation + i × rotationIncrement`. The approved logo uses 6 squares at 15° steps from 7.5°, which makes it mirror-symmetric. Each square is 1.58 × the tile wide, with a very small corner radius.
- **Transparency:** the squares are translucent and overlap with `multiply` blending, like tinted glass: every overlap gets deeper, so the centre darkens to royal blue around the tile while the tips stay light. The shades come from the overlaps themselves and update as the squares rotate. (`blendMode: 'normal'` gives plain alpha compositing instead.)
- **Fades** (`fade`, off by default): each square can fade across its own surface, from its colour at full strength on one edge to `fadeColour` and near-transparency on the other. The direction turns by `fadeTurn` from one square to the next, so overlaps vary instead of stacking into a uniform disc, and the layers seem to weave in and out as in the reference. Each fade is a `linearGradient` in the square's own frame, so it turns with the square when animated.
- **Bounds:** worked out in closed form. A rounded square rotated by θ reaches `(s/2 − r)(|cos θ| + |sin θ|) + r` from its centre. This gives a tight `viewBox` for static output, and a "rotation-safe" frame for animation so nothing clips.
- **Central tile** (`generateTile`): an opaque square with four translucent white or navy triangles meeting at an off-centre point (`facets.apexX/apexY`). This produces the folded facets without tracing anything. The facet paths follow the rounded corners exactly.
- **"TS" lettering:** set in Open Sans ExtraBold. Its cap height is `textScale` × the tile, and it's placed against the bottom-right margins (`textOffsetX/Y`).

### Typography (shared)

- **Glyphs:** fonts are parsed with [opentype.js](https://github.com/opentypejs/opentype.js). `layoutTextRun` positions glyphs using the font's kerning plus `letterSpacing` and turns each one into SVG path data. The source keeps the actual text, font and typographic parameters, never stored coordinates.
- **Wordmark font:** Playfair Display Black, the closest licensed match to the reference's high-contrast editorial serif with ball terminals. The reference's letters are narrower, so the wordmark condenses Playfair's outlines horizontally (`condense`, 0.92) and tightens the tracking. Condensing scales the outlines themselves, so the flourish joins are measured on the condensed strokes.
- **Lines:** "London" is indented so the ball of its L flourish lines up with the left edge of the "T" below, and the lines are set tight (0.72 em apart), as in the reference.
- **Alignment:** `placeWordmark` derives the wordmark's font size so that the top of the capital L to the baseline of "TypeScript" spans a given height (in the flat concept, the tile's). The tile's top and bottom edges line up with the lettering at any size.
- **Flourishes:** the curl leaving the top-left of the L and the terminal on the final t come from one generator (`curlGeometry`). It offsets a cubic Bézier centreline by a swelling width and finishes with a ball. The two flourishes are mirror images.

#### Animation

`engine/animation.ts` is pure maths:

- **`layerVelocities`:** gives every square its own deterministic speed, spread around `baseVelocity` by a golden-ratio sequence, optionally alternating direction.
- **`advanceRotations`:** integrates rotations frame by frame, so speed changes take effect smoothly.
- **`settleRotations`:** eases each square back to the nearest angle that looks identical to its static one (squares repeat every 90°). Stopping is therefore a short glide, never a jump.

`useLayerRotations` (`components/useLayerRotations.ts`) runs these functions on `requestAnimationFrame` and passes the rotations to the same `TypeScriptMark` / `LondonTypeScriptLogo` components used for the static logo. Rotation is an SVG `rotate()` attribute about the shared origin, not a CSS `transform-origin`, so it behaves the same in Chrome, Firefox and Safari. Animation is off for users who prefer reduced motion.

#### Export

`renderLogoSvg(variant, model)` renders the components with React's `renderToStaticMarkup`. The studio's download buttons and `scripts/generate-assets.ts` both call it, so previews and files can never drift apart. `npm run build` regenerates the assets before building.

### Fonts

Both fonts are SIL Open Font License 1.1, installed from `@fontsource` and pinned by `package-lock.json`. Each environment loads the bytes its own way and hands them to `parseLogoFonts`:

- **Browser:** Vite URL imports, in `src/shared/react/fonts.browser.ts`. (Components that also render in Node import the specific `shared/react` files they need, never its index, which includes this browser-only loader.)
- **Node:** the file system, in `scripts/node-fonts.ts`.

## Using the components in a website

```tsx
import { LondonTypeScriptLogo, AnimatedTypeScriptMark } from './src/concepts/flat/components';
import { buildLogo, defaultLogoConfig } from './src/concepts/flat/engine';
import { loadLogoFonts } from './src/shared/react';

const logo = buildLogo(defaultLogoConfig, await loadLogoFonts());

<LondonTypeScriptLogo logo={logo} className="w-96" />
<AnimatedTypeScriptMark emblem={logo.emblem} animation={defaultLogoConfig.animation} />
```

For static pages, simply use the generated files in `public/assets/`.

## Tests

`npm test` covers:

- **Geometry:** layer rotations, palette cycling, size taper, the closed-form bounds and their 90° symmetry, and the rotation-safe radius.
- **Animation:** distinct deterministic speeds, integration, shortest symmetric settling, and the easing.
- **Layout:** the tile aligns with the top of "London" and the baseline of "TypeScript" at several sizes; the emblem–wordmark gap; and the flourishes mirroring each other and joining their strokes.
- **Export:** identical output on every run; valid standalone documents with no `<text>` or images; every square present as its own element.
- **Saved configurations:** parsing corrupt storage, and merging older saved configurations with current defaults.

## Project structure

```
src/
  shared/              palette, fonts, typography, wordmark (framework-free)
    react/             SVG frame, wordmark renderer, browser font loading
  concepts/
    flat/
      engine/          config, geometry, animation (framework-free)
      components/      React renderers, animation hook, SVG export
      FlatStudio.tsx   the concept's studio page (with controls.ts, starters.ts)
  studio/              shell: concept registry, layout, references, saved configurations
scripts/
  generate-assets.ts   writes public/assets/*.svg
  node-fonts.ts        loads the fonts in Node (generator and tests)
public/
  assets/              generated SVGs: do not edit
  references/          images the concepts are compared against
```
