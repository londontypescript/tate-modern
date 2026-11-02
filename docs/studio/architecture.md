# Code layout

The code is split four ways:

- **`src/bubble/`:** the logo. Its engine, wordmark, React renderers, asset list and studio, the main page that `pnpm dev` opens (`index.html`).
- **`src/shared/`:** what everything uses. The palette, font files, typography (glyph layout and flourishes), standalone SVG export and SHA-256, plus the 0.4.0 wordmark, including `placeWordmark`, which sets it beside any emblem for a horizontal lockup. Framework-free, with React pieces (the SVG frame, the wordmark renderer, standalone SVG export, font loading in the browser, the reduced-motion preference) in `src/shared/react/`.
- **`src/concepts/<name>/`:** the frozen 0.4.0 concepts (Flat, 3D, Projected), each with its own engine, renderers and controls, and a default-exported studio page.
- **`src/studio/`:** the frozen 0.4.0 studio's shell, at `legacy.html`. The concept registry (`concepts.ts`), the switcher, the shared two-column layout, reference comparison, saved configurations and UI building blocks.

The concepts and their studio are kept as they were at 0.4.0; [How the concepts work](concepts.md) describes them.

## The bubble

`src/bubble/` has six parts, each depending only on those before it:

- **`engine/`:** framework-free drawing data. `buildBubble({ theme, detail, lettering })` returns the emblem as plain layers and definitions in a 240-unit box: the sunset fan and the blue TS tile (`emblem.ts`) inside the glass (`glass.ts` for the full step, `rimGlass.ts` for the small one). `detail.ts` names the four steps (`full`, `small`, `tiny`, `none`) and the sphere diameter each starts at; `bounds.ts` keeps the sphere, the painted area and each step's frame apart. `slots.ts` holds one recipe per place the logo lands (the favicon, Apple touch icon, GitHub avatar, README header, Meetup photo and the studio's previews): which drawing, theme, step, background and size it takes. `edges.ts` is the optional sunset band and rounded corners a recipe can offer (the Meetup photo only).
- **`wordmark/`:** "London" over "TypeScript" in Exo 2 Bold, outlined, with the kerning opentype.js misses read from the font's GPOS table (`kerning.ts`). `lockup.ts` sets it beside the emblem in the reference lockup's proportions; `contrast.ts` is the WCAG contrast the colours are checked against.
- **`react/`:** renders the drawing data to SVG. `BubbleSvg` draws an emblem, `SlotSvg` a recipe's whole image (with its band and corners); `renderBubbleSvg` and `renderSlotSvg` write them as standalone files with ids taken from their content.
- **`banner/`:** the lockup with optional text beside it, as a 1200 × 208 strip for READMEs and websites, or framed in the Meetup photo's canvas. `layout.ts` holds the strip's rules and `text.ts` outlines the text in Exo 2 Light with the same GPOS kerning; `framing.ts` places the strip in either framing, and `BannerSvg` draws both. `scripts/banner.ts` (`pnpm banner --help`) and the studio's Banner topic write the same files through `renderBannerSvg`, named by `bannerFileName` with a hash of the drawing so a changed banner gets a new address; a test keeps the README's own banners in `docs/images/` current. [The banner](banner.md) describes its rules.
- **`assets/`:** `manifest.ts` lists every file in `public/assets/`, with its name, format and source (a slot recipe, the emblem or the wordmark); `renderAssetSvg` draws each one.
- **`studio/`:** the studio page, described in [Using the studio](using-the-studio.md#the-bubble-studio). `App.tsx` loads the fonts once for both the header, a live banner in its own Suspense (`StudioHeader.tsx`), and the page; `StudioPage.tsx` lists the topics. The Banner topic (`BannerTopic.tsx`) and the Meetup photo's row share their toggle buttons (`Choices.tsx`) and their SVG and PNG downloads (`Downloads.tsx`), where the browser draws the PNG from the same SVG.

`scripts/generate-assets.ts` loads the fonts from disk, draws every manifest entry with `renderAssetSvg`, writes SVGs as they are and PNGs through resvg, and removes any file in `public/assets/` the manifest doesn't list. The studio's downloads call the same renderers, so the emblem's download is byte for byte the committed file. To change the logo, change `src/bubble/` and run `pnpm generate:assets`.

## Project structure

```
src/
  bubble/              the logo
    engine/            drawing data, detail steps, boxes, slot recipes, band and corners (framework-free)
    wordmark/          Exo 2 wordmark, GPOS kerning, lockup, contrast
    react/             SVG renderers and standalone export
    banner/            the lockup with optional text: strip and Meetup framing
    assets/            the list of generated files and how each is drawn
    studio/            the bubble's studio (index.html)
  shared/              palette, fonts, typography, wordmark, SHA-256 (framework-free)
    react/             SVG frame, wordmark renderer, standalone SVG export, browser font loading
  concepts/            frozen 0.4.0 concepts
    three/             3D concept: config, stack maths, R3F scene, studio page
    projected/         projected concept: engine (projection, shading), SVG components, studio page
    flat/
      engine/          config, geometry, animation (framework-free)
      components/      React renderers, animation hook, SVG export
      FlatStudio.tsx   the concept's studio page (with controls.ts, starters.ts)
  studio/              frozen 0.4.0 studio's shell (legacy.html): concept registry, layout, references, saved configurations
scripts/
  generate-assets.ts   writes public/assets/ from src/bubble/assets/manifest.ts
  banner.ts            writes a banner (SVG, and PNG through resvg)
  node-fonts.ts        loads the fonts in Node (generator and tests)
  score/               scores the flat emblem against the original (see scoring.md)
public/
  assets/              generated SVGs and PNGs: do not edit
  references/          images the 0.4.0 concepts are compared against
```

## Fonts

All four fonts are SIL Open Font License 1.1, installed from `@fontsource` and pinned by `pnpm-lock.yaml`:

- **Exo 2 Bold and Light:** the bubble's wordmark, and a banner's text, listed in `bubbleFontFiles` and parsed by `src/bubble/wordmark/fonts.ts`. Only the bubble's page loads them.
- **Open Sans ExtraBold:** the TS on the tile, in the bubble and the 0.4.0 concepts.
- **Playfair Display Black:** the 0.4.0 concepts' wordmark.

The last two are listed in `fontFiles` and parsed by `parseLogoFonts` in `src/shared/fonts.ts`. Each environment loads the bytes its own way:

- **Browser:** Vite URL imports, in `src/shared/react/fonts.browser.ts` and `src/bubble/wordmark/fonts.browser.ts`. (Components that also render in Node import the specific `shared/react` files they need, never its index, which includes the browser-only loader.)
- **Node:** the file system, in `scripts/node-fonts.ts`.

## Tests

`pnpm test` covers, for the bubble:

- **Drawing:** the fan, tile, TS and glass against the reference; the detail steps and the diameters they swap at; the boxes and each step's frame; TS contrast against its tile.
- **Wordmark and lockup:** Exo 2 Bold drawn as the font draws it, the GPOS kerning against what Chrome applies, line spacing and widths against the reference lockup, and lockups that need no fonts.
- **Slots and edges:** every slot's recipe and image; the Meetup photo's band and corners, clear of its safe rectangle, and plain by default as the committed file.
- **Export:** the same file every run; ids unique per drawing, live or exported; `public/assets/` holding exactly the manifest's files and matching the studio's download.
- **Banner:** the strip's and the Meetup framing's rules; text outlined and kerned as the browser sets it, a character the font lacks refused by name; self-contained files with their own ids; safe file names that change with the drawing; and the README's banners kept current.
- **Studio:** every topic in order, light and dark columns, the mismatch check, the topic bar's links, the Meetup photo's toggles and download names, the browser's PNG, and the build writing both pages with Exo 2 in the bubble's only. The Banner topic previews exactly what it downloads (the README's banners byte for byte), escapes typed text, names files by slug and shows an error, never a blank, for a missing character; the header's heading keeps the name "London TypeScript Studio" and the strip's shape while the fonts load.

And for the frozen 0.4.0 concepts:

- **Geometry:** layer rotations, palette cycling, size taper, the closed-form bounds and their 90° symmetry, and the rotation-safe radius.
- **Animation:** distinct deterministic speeds, integration, shortest symmetric settling, and the easing.
- **Layout:** the tile aligns with the top of "London" and the baseline of "TypeScript" at several sizes; the emblem–wordmark gap; and the flourishes mirroring each other and joining their strokes.
- **Export:** identical output on every run; valid standalone documents with no `<text>` or images; every square present as its own element; ids taken from each file's content, unique and resolving within their own SVG when different exports share a page; SHA-256 against published test vectors.
- **Fonts:** still Playfair Display Black and Open Sans ExtraBold from the same files, and no Exo 2 in the frozen studio's page.
- **Saved configurations:** parsing corrupt storage, and merging older saved configurations with current defaults.
- **3D stack:** the prototype's placement of each slab, drift and opacity falloff, the scrambled angles, and the slab's chamfer measurements.
- **Projection:** the slab faces against `ExtrudeGeometry`'s layout, the colour conversions and tone mapping, metal lit only by its specular lobe, culling, paint order, lettering, gradients, spinning, and deterministic, self-contained SVG output.

The scorer in `scripts/score/` has its own tests; see [Scoring](scoring.md).
