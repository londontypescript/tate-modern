# Code layout

The code is split three ways:

- **`src/shared/`:** what every concept uses. The palette, font loading, typography (glyph layout and flourishes) and the wordmark, including `placeWordmark`, which sets it beside any emblem for a horizontal lockup. Framework-free, with React pieces (the SVG frame, the wordmark renderer, font loading in the browser, the reduced-motion preference) in `src/shared/react/`.
- **`src/concepts/<name>/`:** each concept's own engine, renderers and controls, and a default-exported studio page.
- **`src/studio/`:** the shell. The concept registry (`concepts.ts`), the switcher, the shared two-column layout, reference comparison, saved configurations and UI building blocks.

To add a concept, create `src/concepts/<name>/`, export a page component that renders `<StudioLayout previews={…} controls={…} />`, and register it in `src/studio/concepts.ts`.

## Project structure

```
src/
  shared/              palette, fonts, typography, wordmark, SHA-256 (framework-free)
    react/             SVG frame, wordmark renderer, standalone SVG export, browser font loading
  concepts/
    three/             3D concept: config, stack maths, R3F scene, studio page
    projected/         projected concept: engine (projection, shading), SVG components, studio page
    flat/
      engine/          config, geometry, animation (framework-free)
      components/      React renderers, animation hook, SVG export
      FlatStudio.tsx   the concept's studio page (with controls.ts, starters.ts)
  studio/              shell: concept registry, layout, references, saved configurations
scripts/
  generate-assets.ts   writes public/assets/ (the bubble's files)
  node-fonts.ts        loads the fonts in Node (generator and tests)
  score/               scores the flat emblem against the original (see scoring.md)
public/
  assets/              generated SVGs and PNGs: do not edit
  references/          images the concepts are compared against
```

## Fonts

Both fonts are SIL Open Font License 1.1, installed from `@fontsource` and pinned by `pnpm-lock.yaml`. Each environment loads the bytes its own way and hands them to `parseLogoFonts`:

- **Browser:** Vite URL imports, in `src/shared/react/fonts.browser.ts`. (Components that also render in Node import the specific `shared/react` files they need, never its index, which includes this browser-only loader.)
- **Node:** the file system, in `scripts/node-fonts.ts`.

## Tests

`pnpm test` covers:

- **Geometry:** layer rotations, palette cycling, size taper, the closed-form bounds and their 90° symmetry, and the rotation-safe radius.
- **Animation:** distinct deterministic speeds, integration, shortest symmetric settling, and the easing.
- **Layout:** the tile aligns with the top of "London" and the baseline of "TypeScript" at several sizes; the emblem–wordmark gap; and the flourishes mirroring each other and joining their strokes.
- **Export:** identical output on every run; valid standalone documents with no `<text>` or images; every square present as its own element; ids taken from each file's content, unique and resolving within their own SVG when different exports share a page; the generated assets matching the studio's download; SHA-256 against published test vectors.
- **Saved configurations:** parsing corrupt storage, and merging older saved configurations with current defaults.
- **3D stack:** the prototype's placement of each slab, drift and opacity falloff, the scrambled angles, and the slab's chamfer measurements.
- **Projection:** the slab faces against `ExtrudeGeometry`'s layout, the colour conversions and tone mapping, metal lit only by its specular lobe, culling, paint order, lettering, gradients, spinning, and deterministic, self-contained SVG output.
