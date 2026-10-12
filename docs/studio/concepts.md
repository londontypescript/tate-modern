# How the concepts work

Each concept lives in `src/concepts/<name>/`; what they share is in `src/shared/`. See [the code layout](architecture.md) for the overall structure.

## Flat

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

### Geometry

- **Background squares** (`generateLayers`): `layerCount` squares share a centre. Square *i* is rotated `initialRotation + i × rotationIncrement`. The approved logo uses 6 squares at 15° steps from 7.5°, which makes it mirror-symmetric. Each square is 1.58 × the tile wide, with a very small corner radius.
- **Transparency:** the squares are translucent and overlap with `multiply` blending, like tinted glass: every overlap gets deeper, so the centre darkens to royal blue around the tile while the tips stay light. The shades come from the overlaps themselves and update as the squares rotate. (`blendMode: 'normal'` gives plain alpha compositing instead.)
- **Fades** (`fade`, off by default): each square can fade across its own surface, from its colour at full strength on one edge to `fadeColour` and near-transparency on the other. The direction turns by `fadeTurn` from one square to the next, so overlaps vary instead of stacking into a uniform disc, and the layers seem to weave in and out as in the reference. Each fade is a `linearGradient` in the square's own frame, so it turns with the square when animated.
- **Bounds:** worked out in closed form. A rounded square rotated by θ reaches `(s/2 − r)(|cos θ| + |sin θ|) + r` from its centre. This gives a tight `viewBox` for static output, and a "rotation-safe" frame for animation so nothing clips.
- **Central tile** (`generateTile`): an opaque square with four translucent white or navy triangles meeting at an off-centre point (`facets.apexX/apexY`). This produces the folded facets without tracing anything. The facet paths follow the rounded corners exactly.
- **"TS" lettering:** set in Open Sans ExtraBold. Its cap height is `textScale` × the tile, and it's placed against the bottom-right margins (`textOffsetX/Y`).

### Animation

`engine/animation.ts` is pure maths:

- **`layerVelocities`:** gives every square its own deterministic speed, spread around `baseVelocity` by a golden-ratio sequence, optionally alternating direction.
- **`advanceRotations`:** integrates rotations frame by frame, so speed changes take effect smoothly.
- **`settleRotations`:** eases each square back to the nearest angle that looks identical to its static one (squares repeat every 90°). Stopping is therefore a short glide, never a jump.

`useLayerRotations` (`components/useLayerRotations.ts`) runs these functions on `requestAnimationFrame` and passes the rotations to the same `TypeScriptMark` / `LondonTypeScriptLogo` components used for the static logo. Rotation is an SVG `rotate()` attribute about the shared origin, not a CSS `transform-origin`, so it behaves the same in Chrome, Firefox and Safari. Animation is off for users who prefer reduced motion.

### Export

`renderLogoSvg(variant, model)` renders the components with React's `renderToStaticMarkup`. The studio's download buttons and `scripts/generate-assets.ts` both call it, so previews and files can never drift apart. `pnpm build` regenerates the assets before building.

## 3D

- `config.ts`: typed parameters; the defaults are the prototype's own numbers.
- `stack.ts`: framework-free placement of each slab (position, turn, scale, opacity), tested in `stack.test.ts`.
- `Scene.tsx`: the react-three-fiber scene: slab geometry (`ExtrudeGeometry` with the prototype's bevel settings), lights, environment, lettering and the still capture.
- `ThreeStudio.tsx`, `controls.ts`, `starters.ts`: the studio page.

three.js loads only when the 3D concept is opened.

## Projected

A tiny renderer for lit glass boxes, framework-free in `engine/`:

- `slab.ts`: a slab's faces, built ring by ring as three's `ExtrudeGeometry` builds its bevel (a quarter-circle profile in `bevelSegments` steps).
- `project.ts`: places the slabs with the 3D concept's own `placeSlabs`, applies the scene's transforms, culls faces turned away from the camera, shades every corner, projects through the perspective camera and orders the slabs back to front as three sorts transparent objects. Each face gets a flat colour, or a gradient between its lightest and darkest corners. The "TS" is mapped onto the front face with an affine `matrix()`.
- `shading.ts`: the parts of three.js that set a pixel's colour, ported: `MeshStandardMaterial`'s Lambert diffuse and GGX specular (Smith-correlated visibility, Schlick Fresnel), ACES filmic tone mapping (react-three-fiber's default) and sRGB encoding. With the same numbers, a face comes out the colour the 3D render gives it.
- `vec.ts`: the vector maths.

`components/` renders the polygons to SVG and sets the shared wordmark beside them. Environment reflections are not modelled.

## Shared typography

- **Glyphs:** fonts are parsed with [opentype.js](https://github.com/opentypejs/opentype.js). `layoutTextRun` positions glyphs using the font's kerning plus `letterSpacing` and turns each one into SVG path data. The source keeps the actual text, font and typographic parameters, never stored coordinates.
- **Wordmark font:** Playfair Display Black, the closest licensed match to the reference's high-contrast editorial serif with ball terminals. The reference's letters are narrower, so the wordmark condenses Playfair's outlines horizontally (`condense`, 0.92) and tightens the tracking. Condensing scales the outlines themselves, so the flourish joins are measured on the condensed strokes.
- **Lines:** "London" is indented so the ball of its L flourish lines up with the left edge of the "T" below, and the lines are set tight (0.72 em apart), as in the reference.
- **Alignment:** `placeWordmark` derives the wordmark's font size so that the top of the capital L to the baseline of "TypeScript" spans a given height (in the flat concept, the tile's). The tile's top and bottom edges line up with the lettering at any size.
- **Flourishes:** the curl leaving the top-left of the L and the terminal on the final t come from one generator (`curlGeometry`). It offsets a cubic Bézier centreline by a swelling width and finishes with a ball. The two flourishes are mirror images.
