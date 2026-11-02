# Using the studio

```bash
pnpm dev              # the studio at http://localhost:5173
pnpm generate:assets  # regenerate public/assets/ (the bubble logo's files)
pnpm test             # unit tests (Vitest)
pnpm typecheck        # strict TypeScript check
pnpm build            # regenerate assets, type-check, build both studios into dist/
```

`pnpm dev` opens the bubble logo's studio. The 0.4.0 studio, with the Flat, 3D and Projected concepts, is kept unchanged at `legacy.html` (in development, http://localhost:5173/legacy.html), linked from the bubble studio's header. Both are development tools, not part of the eventual website.

To try the studio as it is built, `pnpm build && pnpm preview` serves `dist/` at http://localhost:4173.

## The bubble studio

The studio shows the logo as `src/bubble/` draws it. Nothing is tuned there; the drawing is changed in code. Its header is itself a banner: the light lockup with the text "Studio" and a sunset band along the bottom.

![The bubble's studio: the header and topic bar, the Light and Dark download buttons, then the emblem large beside its reference in a light column on white and a dark column on GitHub dark, and below them the emblem at real sizes from 16 px, each labelled with its sphere diameter and detail step](../images/bubble-studio.png)

- **Light and dark side by side:** each topic is a Light column on white and a Dark column on GitHub's dark page (`#0d1117`). On a narrow window only one column shows, picked with the Light / Dark toggle in the topic bar.
- **Topic bar:** stays at the top while scrolling, with a link to each topic:
  - **Large:** the full emblem large, beside the committed reference in `docs/references/bubble/`.
  - **Real sizes:** the emblem at frame widths from 16 to 96 px, each captioned with its sphere's diameter and the step that size gets.
  - **Every step:** every detail step (full, small, tiny, none) forced at every size, so competing steps compare at the same size.
  - **Circle crops:** every step cropped to a circle, as GitHub shows people's avatars.
  - **Lockup:** the emblem and the stacked Exo 2 wordmark at 56 and 110 px emblems.
  - **Banner:** the lockup with optional text beside it, set up with its own controls (see below).
  - **Where it lands:** full width, one row per slot (favicon, Apple touch icon, GitHub avatar, README header, Meetup photo) at the sizes it is seen, light and dark together where it comes as a pair and once where it has a fixed background.
  - **Mismatch check:** each theme on the other background (Large, Real sizes and Every step again), to see that nothing breaks where it isn't meant to land.
- **Download SVG:** Light or Dark, the full emblem alone, byte for byte the committed `london-typescript-bubble-light.svg` or `-dark.svg`.
- **The banner:** the **Banner** topic makes the banner every LTS repo's README, the Meetup group and the website use, described in [The banner](banner.md). **Text** is optional; empty, the lockup stands alone. **Theme** (Light, Dark), **Band** (Off, Left, Bottom), **Alignment** (Left, Centre, Right: where the lockup sits when there is no text; with text it is always on the left) and **Framing** (the 1200 × 208 strip, or 1200 × 675 for the Meetup photo) apply at once. The preview, on the theme's own page, is the file **Download SVG** and **PNG** write, the same drawing `pnpm banner` makes, named for what it shows and a hash of the drawing. A character Exo 2 Light lacks shows an error naming it instead of the preview, and the downloads wait until it's gone.
- **The Meetup photo's band and corners:** its row in **Where it lands** has two toggles, both off at first: **Band** (Off, Left, Right, Top, Bottom) lays the sunset fan's colours flat along that edge, and **Rounded corners** (Off, On) cuts the corners to transparent. The preview shows the file itself unmasked, plus one card simulating Meetup's own crop. **Download SVG** and **PNG** (1200 × 675, drawn by the browser from the same SVG) follow the toggles; a plain download is named as the committed file, and a band or corners add to the name. The committed asset is always plain.

## The 0.4.0 studio

Across its concepts:

- **Concept switcher:** the tabs in the header. The open concept is kept in the URL hash (for example `#flat`), so reloads and links keep it. Concepts load on demand.
- **Compare with a reference:** shows one of the reference images in `public/references/` beside the previews: the 2D mockup and the Three.js stack and hero concepts. The choice is remembered in this browser.

The flat concept opens on its defaults (`defaultLogoConfig`), the logo approved in 0.4.0, which is also its one starter, `Default`. It has:

- **Previews:** the complete logo on the reference's cream background, a static emblem, and an animation preview.
- **Sliders:**
  - Squares: layer count, rotation increment, initial rotation, size, size taper, corner radius, opacity, and the fade across each square (strength, turn per square, first direction).
  - Sheet variation: random, per-sheet departures from the even rosette. The defaults turn them on (uneven angles 12°, uneven sizes 0.15, stretch 0.12, shift 8, seed 7); an amount of 0 turns that departure off.
    - **Uneven angles** (0-20°): turns each sheet by up to this much either way.
    - **Uneven sizes** (0-0.3): grows or shrinks each sheet by up to this fraction, on top of the taper.
    - **Stretch from square** (0-0.3): makes each sheet a rectangle, up to this fraction wider and as much shorter (or the other way), so its average side stays the same.
    - **Shift off centre** (0-20, where the tile is 100 wide): moves each sheet's centre by up to this much across and, separately, up or down. Each sheet still turns about its own centre.
    - **Variation seed** (1-999): picks which random variation you get. The same seed always gives the same emblem; changing the number of layers keeps the existing sheets' variation and adds new sheets after them.
  - Halo: a soft navy shadow under the tile, so it looks lifted off the sheets, as in the 2D mockup. It is the tile's outline moved left and down, solid, with a soft edge all round, so it is strongest on the left and bottom and faint on the top and right. It is drawn without SVG filters, as one navy shape seen through a mask of grey gradients, between the sheets and the tile, and stays still while the sheets turn. On in the defaults, at strength 0.4, reach 14 and offset 5.
    - **Halo strength** (0-1): how dark the shadow is where the tile's outline would be; 0 turns the halo off.
    - **Halo reach** (0-40, where the tile is 100 wide): how far the soft edge spreads beyond that outline; 0 also turns it off.
    - **Shadow offset** (0-20): how far the shadow moves left and, by the same amount, down.
  - TS tile: letter size, margins, letter spacing.
  - Wordmark and layout: gap, line spacing, letter spacing, condense letters, flourish scale.
  - Animation: speed and speed variation.
- **Animate squares / Stop animation:** stopping glides each sheet back to the static composition, the short way round: a square looks the same every quarter turn, a stretched sheet every half turn and a fading sheet only after a full turn. Changing a setting while they glide sends them on from where they are.
- **Toggles:** alternate rotation directions, and "multiply overlaps" (a tinted-glass blend mode).
- **Download SVG:** mark, wordmark or complete logo, built from your current slider settings with the same code that generated the 0.4.0 assets. Optionally includes the cream background.
- **Reset:** goes back to the starter shown pressed under **Start from** (see below) and unloads any saved configuration.
- **Saved configurations:** keep named variations in this browser's localStorage, one list per concept.
  - **Start from:** read-only starting points the concept ships with. The one shown pressed is where Reset and New go back to: what the studio opened on, or the starter you picked since. Loading a saved configuration doesn't change it. Where a concept opens on its engine defaults and none of its starters matches them, none is pressed and Reset goes back to those defaults. The flat concept has one starter, `Default`: its defaults, which it opens on, so `Default` is pressed when the studio opens.
  - **New:** starts again from the pressed starter, unloading the current configuration. It asks first if there are unsaved changes.
  - **Duplicate:** saves the current settings as a new configuration named after the loaded one plus "Copy" (for example "Dense rosette Copy", then "Dense rosette Copy 2" if that name is taken) and switches to it. With nothing loaded it's called "New Config". The name opens for editing straight away; press Escape to keep it.
  - **Save as new:** stores the current settings under a name you type; that configuration is then the one being edited.
  - **Save changes:** writes the current settings back to the loaded configuration. It's enabled when there are unsaved changes.
  - **Load, Rename, Delete:** load and delete ask for confirmation when work would be lost.
  - Saved configurations from older versions still load: fields a saved configuration lacks are filled from the defaults, except the sheet variation and the halo, which stay off, so a configuration saved before they existed looks as it did although the defaults turn them on. Values that aren't sensible numbers (for example from a hand-edited file) fall back to the defaults (the sheet variation and the halo to off), and every number is kept within its slider's range; numbers without a slider (the tile's size, corner radius and facets, the wordmark's line indents, the animation's base velocity) are kept within a wide range set in `config.ts`. Whole numbers (layers, seed) round to the nearest. Colours are kept only as `#` and six hex digits (either case, as written), the only form the studio produces: anything else (a colour name, three digits, `url(#…)`, spaces around it, a value that isn't text) takes the default's colour. The squares' colours are kept or replaced as a whole list, so their alternation never changes silently; a wordmark run's bad colour takes the default run's colour at the same place, or black for a run the defaults don't have, and a line whose runs aren't a list of texts takes the default line's runs. A blend mode other than `normal` or `multiply` takes the default, and the TS tile's text, if it isn't text, takes `TS`. Any character of the lettering other than a letter, a digit, `_` or `-` is written into its shape's id as its code point (`u0020` for a space), so ids stay valid. The sliders, toggles, previews and downloads all show the values drawn, while the saved configuration itself is left as it was.

Saved configurations live only in this browser; they aren't shared and don't change the generated assets. `defaultLogoConfig` in `src/concepts/flat/engine/config.ts` was the official logo until 0.5.0; the logo is now the bubble, and `pnpm generate:assets` draws only that. (Flat configurations saved in the original playground still load: the storage key is unchanged.)

### The 3D concept

Open `legacy.html`, then the **3D** tab. It renders the prototype's sculpture with react-three-fiber:

- **Starting points** recreate the arrangements found in the original code: the visible stack in `londontypescript/site` (30 slabs, each turned 0.15 rad, grown 0.1 and pushed back 0.2), its scrambled final state, the hidden second group ("Turned deck"), the same stack with studio reflections, and the earlier seven-slab experiment from `chaquejour` (September 2025).
- **Controls:** the stack (count, turn, scale, depth, drift, tilt), the slab (thickness and chamfer), the material (colour, metalness, roughness, opacity), the lighting (ambient, the two key lights from the right and their direction, the fill light), environment reflections (drei's `Environment` presets, Poly Haven HDRIs fetched from a CDN on first use), camera and spin speed.
- **"TS" on the front slab:** the same lettering as the flat tile, cut from the shared sans font.
- **Wordmark beside it:** the shared wordmark, for judging a lockup.
- **Download PNG** at 1×, 2× or 4× the preview's resolution, on white, cream, black or a transparent background.

### The projected concept

Open `legacy.html`, then the **Projected** tab. It takes the 3D concept's settings (the same starting points and sliders, minus environment reflections) and draws them as polygons:

- **Compare with the live 3D render:** shows the projected emblem beside the real react-three-fiber render of the same settings, framed identically. The two should match.
- **Drawing:** gradients across faces (on by default; a face's highlight varies across it in perspective), see-through back faces, exposure, and the wordmark's size and gap in the lockup.
- **Download SVG:** the mark, the complete logo, or the logo on the chosen background.

### Generated assets

Since 0.5.0, `public/assets/` holds the bubble logo's files. The flat
concept's mark, wordmark and complete logo are no longer generated; this studio still downloads them, and the signed
`v0.4.0` tag keeps the last generated copies. Each flat download is:

- **Static:** no JavaScript.
- **Self-contained:** glyphs are converted to outlines, so no fonts are needed.
- **Responsive:** sized only by a tight `viewBox`, so it scales to its container.
- **Deterministic:** the same configuration always produces byte-identical files.
- **Transparent:** no background, so it can sit on anything.

Each square, facet and glyph is its own element with an id: `lts-`, the file's own prefix of 32 hex digits, then the shape's name, for example `lts-78ea8feaba35190bc341db321e637e29-layer-3`. To find a shape, look for the name at the end (`-layer-3`). The prefix is the same for every id in one file.

#### Ids and pages with several logos

Each exported SVG, from the studio's Download buttons or from `pnpm generate:assets`, takes its id prefix from its own content: the file is drawn once with the plain prefix `lts`, that drawing is hashed (SHA-256) with its concept and variant, and the file is drawn again with `lts-` and 128 bits of the hash. So:

- **Different logos can share a page inline.** Every id in the file carries the prefix (squares, tile, glyphs, gradients, masks), and so does every `url(#…)` that points at one, so a second logo never paints with the first one's fades or halo. The mark, wordmark and complete logo of one design each get their own prefix.
- **The same file always gets the same ids.** Exporting again, or regenerating the assets, gives byte-identical files, and the bubble studio's emblem download matches the file `pnpm generate:assets` writes.
- **Changing anything changes the ids,** the background included. Don't rely on a shape's full id across versions of the logo; rely on its name.

**Not covered:** two inline copies of the _same_ file still share ids, since no prefix written into a file can tell its copies apart. They mostly render correctly, but can lose their gradients when the first copy is hidden. For repeated copies, use `<img>` or a CSS background, where each file is its own document; when the markup must be inline, give each copy its own ids with a tool such as SVGO's `prefixIds` or SVGR.

`<img>` and CSS backgrounds were never affected. The live React components of the flat and projected concepts, which the studio draws, take their gradients' ids from React's `useId` when given no `idPrefix`, so several can share a page too: the projected page's live 3D comparison shows two drawings of one emblem, each with its own ids.

The files in `public/assets/` are build artefacts. Never edit them by hand: change the bubble's drawing in `src/bubble/` and run `pnpm generate:assets`.

### Using the components in a website

```tsx
import { LondonTypeScriptLogo, AnimatedTypeScriptMark } from './src/concepts/flat/components';
import { buildLogo, defaultLogoConfig } from './src/concepts/flat/engine';
import { loadLogoFonts } from './src/shared/react';

const logo = buildLogo(defaultLogoConfig, await loadLogoFonts());

<LondonTypeScriptLogo logo={logo} className="w-96" />
<AnimatedTypeScriptMark emblem={logo.emblem} animation={defaultLogoConfig.animation} />
```

For static pages, use the downloaded SVG files, or the bubble logo's files in `public/assets/`.
