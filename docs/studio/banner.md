# The banner

The banner is the London TypeScript lockup with optional text beside it: the header of every LTS repo's README,
the Meetup group's photo, the website's header and the studio's own. One renderer draws it, in `src/bubble/banner/`;
`pnpm banner` writes it from the command line and the studio's **Banner** topic previews and downloads it, so a
banner made either way is the same file.

## What it looks like

- **The strip:** 1200 × 208, transparent, for READMEs and websites. The lockup sits in a 120-high layout box with 44
  clear above and below, and no side margins: the bubble's glass meets the left edge and the text's ink ends on the
  right edge.
- **Text, optional:** set in Exo 2 Light, outlined to paths, right-aligned. Its capitals are as tall as the
  wordmark's, on the baseline of "TypeScript". Long text shrinks only when it would come within 56 of the wordmark.
- **No text:** the lockup alone, aligned left, centre or right.
- **Theme:** light for white pages, with black text; dark for GitHub's dark page, with the wordmark's own light ink.
- **Band, optional:** the sunset fan's colours laid flat, 14 thick, along the bottom or down the left. A left band
  keeps the bubble 40 clear of it.
- **The Meetup framing:** a 1200 × 675 opaque image on the theme's page. The lockup and text are fitted together
  into the Meetup photo's safe rectangle, so Meetup's crops never cut them, and a band runs along the photo's own
  edge as on the Meetup photo.

The rules are pinned by tests in `src/bubble/banner/`.

## Making one

In the studio, open **Banner** in the topic bar: type the text (or leave it empty for the lockup alone), pick the
theme, band, alignment and framing, and download the SVG or PNG. The preview is the file.

From the command line:

```bash
pnpm banner --text "Tate Modern" --band bottom --out docs/images
pnpm banner --framing meetup --theme dark --band left --format both --out meetup
pnpm banner --help
```

The command writes both themes unless `--theme` picks one, and SVG unless `--format` asks for PNG too. Its PNG
comes from resvg; the studio's from the browser, drawing the same SVG.

## Files

- **Self-contained:** no fonts, images or links, so an SVG shows the same in an `<img>`, on GitHub and offline.
- **Named for what they show:** the text as a slug (lower-case letters and digits joined by hyphens, accents
  dropped), then the framing, theme, band and, with no text, the alignment, then the first eight hex digits of the
  SVG's SHA-256: the README's light banner is `tate-modern-light-band-bottom-` and its hash. A PNG takes its SVG's
  name.
- **A changed drawing gets a new name.** GitHub's image proxy and Safari cache images by address, so a README that
  points at a new name never shows a stale banner. When the logo changes, regenerate the banner and point the README
  at the new files.

## Text

The text is drawn as outlines and written into the file only as its accessible name, which React escapes. It never
reaches a file name except as the slug, so no character in it can choose where a file goes.

Exo 2 Light covers Latin: accented letters and common punctuation draw, but a character the font lacks (Ł, an emoji,
a line break) is refused with an error naming it, never drawn as a blank. Spaces at either end are dropped.

## Using it in a README

Put the two files in a `<picture>`, so GitHub shows the dark banner on a dark page, inside a `<p>` so the paragraph
below keeps its space, with each file's real name in place of `HASH`:

```html
<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/little-venice-dark-band-bottom-HASH.svg" />
    <img
      alt="London TypeScript: Little Venice"
      src="docs/images/little-venice-light-band-bottom-HASH.svg"
      width="100%"
    />
  </picture>
</p>
```

tate-modern's own README banners are kept in `docs/images/`, and a test regenerates them, so a change to the logo
can't leave them stale.
