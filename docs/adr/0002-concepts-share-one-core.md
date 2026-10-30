# ADR 0002: The concepts share one core

Date: 2026-10-12. Status: accepted; partly superseded by [ADR 0004](0004-the-bubble-is-the-logo.md) for the bubble only (its identical-wordmark invariant and its concept registry and location rule). It still applies to the frozen concepts.

## Context

The studio began as a single playground for one logo design, the flat concept, with its engine,
components and controls in one tree (`src/logo`, `src/components`, `src/playground`). The aim
became comparing several concepts for the same London TypeScript logo side by side, with a switcher
between them. Commit 3f29d94 restructured the code for that.

Some code belongs to the logo itself, whichever way it is drawn: the brand colours, the fonts, the
typography, and the wordmark with its placement beside an emblem. Other code belongs to one way of
drawing it: the flat concept's geometry, animation and controls. The split was made during the
restructure without the maintainer being asked; this ADR records it after the fact, with the
maintainer's reasons.

## Decision

Everything every concept needs lives in `src/shared/`: the palette, the fonts, the typography, the
wordmark and `placeWordmark`, which sets it beside any emblem (3f29d94). The tile lettering joined
them later, when the projected concept needed it as well as the flat and 3D ones (b4d22b3). Shared
code is framework-free; its React pieces are in `src/shared/react/`.

Each concept keeps its own engine, components and controls in `src/concepts/<name>/`. A concept
exports a studio page and is registered in `src/studio/concepts.ts`, so adding one doesn't touch
the others.

Each concept needs features of its own: the flat one's rotated squares and fades, the 3D one's
lights and camera, the projected one's ported shading. One engine shared by every concept would cut
them all down to what they have in common, so the concepts share only what really is the same for
all of them. The wordmark is the same in every concept, and only the emblem beside it changes, so
the wordmark is shared, not copied into each concept. The commit says the generated assets stayed
byte-identical, so the split changed no output.

## What would end it

A concept that needs a different wordmark, palette or typography from the others, which would make
the shared code a constraint rather than a guarantee; or the concepts being cut down to one, when
the shared/own split has nothing left to separate.
