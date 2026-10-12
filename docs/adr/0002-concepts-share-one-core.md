# ADR 0002: The concepts share one core

Date: 2026-10-12. Status: accepted.

## Context

The studio began as a single playground for one logo design, the flat concept, with its engine,
components and controls in one tree (`src/logo`, `src/components`, `src/playground`). The aim
became comparing several concepts for the same London TypeScript logo side by side, with a switcher
between them. Commit 3f29d94 restructured the code for that.

Some code belongs to the logo itself, whichever way it is drawn: the brand colours, the fonts, the
typography, and the wordmark with its placement beside an emblem. Other code belongs to one way of
drawing it: the flat concept's geometry, animation and controls. The options were to keep one engine
that every concept bends to fit, or to give each concept its own engine and share only what is the
same for all of them. The history doesn't record that the first option was tried or why it was
rejected.

## Decision

Everything every concept needs lives in `src/shared/`: the palette, the fonts, the typography, the
wordmark and `placeWordmark`, which sets it beside any emblem (3f29d94). The tile lettering joined
them later, when the projected concept needed it as well as the flat and 3D ones (b4d22b3). Shared
code is framework-free; its React pieces are in `src/shared/react/`.

Each concept keeps its own engine, components and controls in `src/concepts/<name>/`. A concept
exports a studio page and is registered in `src/studio/concepts.ts`, so adding one doesn't touch
the others.

The commit says the generated assets stayed byte-identical, so the split changed no output. The
history doesn't record why sharing the wordmark and palette was preferred to each concept carrying
its own copy.

## What would end it

A concept that needs a different wordmark, palette or typography from the others, which would make
the shared code a constraint rather than a guarantee; or the concepts being cut down to one, when
the shared/own split has nothing left to separate.
