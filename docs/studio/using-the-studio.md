# Using the studio

```bash
pnpm dev              # the studio at http://localhost:5173
pnpm generate:assets  # regenerate public/assets/*.svg
pnpm test             # unit tests (Vitest)
pnpm typecheck        # strict TypeScript check
pnpm build            # regenerate assets, type-check, build the studio into dist/
```

`pnpm dev` opens the studio (a development tool, not part of the eventual website):

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

Saved configurations live only in this browser; they aren't shared and don't change the generated assets. To make a configuration the official logo, copy its values into `defaultLogoConfig` in `src/concepts/flat/engine/config.ts` and run `pnpm generate:assets`. (Flat configurations saved in the original playground still load: the storage key is unchanged.)

## The 3D concept

`pnpm dev`, then the **3D** tab. It renders the prototype's sculpture with react-three-fiber:

- **Starting points** recreate the arrangements found in the original code: the visible stack in `londontypescript/site` (30 slabs, each turned 0.15 rad, grown 0.1 and pushed back 0.2), its scrambled final state, the hidden second group ("Turned deck"), the same stack with studio reflections, and the earlier seven-slab experiment from `chaquejour` (September 2025).
- **Controls:** the stack (count, turn, scale, depth, drift, tilt), the slab (thickness and chamfer), the material (colour, metalness, roughness, opacity), the lighting (ambient, the two key lights from the right and their direction, the fill light), environment reflections (drei's `Environment` presets, Poly Haven HDRIs fetched from a CDN on first use), camera and spin speed.
- **"TS" on the front slab:** the same lettering as the flat tile, cut from the shared sans font.
- **Wordmark beside it:** the shared wordmark, for judging a lockup.
- **Download PNG** at 1×, 2× or 4× the preview's resolution, on white, cream, black or a transparent background.

## The projected concept

`pnpm dev`, then the **Projected** tab. It takes the 3D concept's settings (the same starting points and sliders, minus environment reflections) and draws them as polygons:

- **Compare with the live 3D render:** shows the projected emblem beside the real react-three-fiber render of the same settings, framed identically. The two should match.
- **Drawing:** gradients across faces (on by default; a face's highlight varies across it in perspective), see-through back faces, exposure, and the wordmark's size and gap in the lockup.
- **Download SVG:** the mark, the complete logo, or the logo on the chosen background.

## Generated assets

The flat concept's approved configuration is exported as:

| File                                           | Contents                 |
| ---------------------------------------------- | ------------------------ |
| `public/assets/london-typescript-logo.svg`     | Complete horizontal logo |
| `public/assets/london-typescript-mark.svg`     | Emblem only              |
| `public/assets/london-typescript-wordmark.svg` | Two-line wordmark only   |

Each file is:

- **Static:** no JavaScript.
- **Self-contained:** glyphs are converted to outlines, so no fonts are needed.
- **Responsive:** sized only by a tight `viewBox`, so it scales to its container.
- **Deterministic:** the same configuration always produces byte-identical files.
- **Transparent:** no background, so it can sit on anything.

Each square, facet and glyph is its own element with an `lts-…` id, for example `lts-layer-3`.

These files are build artefacts. Never edit them by hand: change the configuration (for the flat concept, `src/concepts/flat/engine/config.ts`) and run `pnpm generate:assets`.

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
