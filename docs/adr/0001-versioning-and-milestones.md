# ADR 0001: Versioning and milestones

Date: 2026-10-12. Status: proposed.

## Context

The studio needed a version scheme before its first milestone, because milestones are named after
what they ship. It isn't published to npm (`private: true`), so a version describes the studio
itself, not an API anyone depends on. `package.json` already said 0.1.0. temple-bar, the London
TypeScript workflow this repo follows, uses Semantic Versioning on 0.x with milestones named after
versions. The alternative weighed was calendar versioning (for example `2026.10`): simpler for a
design project, but it says nothing about how much changed and wouldn't match temple-bar.

## Decision

Semantic Versioning, staying on 0.x while the logo is a prototype:

- A milestone is named after the version it ships (`0.2.0`); a minor version is a milestone's
  worth of studio changes, a patch is a fix between milestones.
- 1.0.0 means the logo design is settled.
- When a milestone closes: bump `package.json`, tag `vX.Y.0` with an annotated, signed tag, and
  publish a GitHub release with notes. Tagging and publishing need the maintainer's yes.

The baseline is `v0.1.0`, tagged on 2026-10-12 on b2fea57: the three concepts on pnpm, Prettier
and temple-bar 0.0.10, before any milestone work.

## What would end it

Publishing the studio or one of its packages to npm, where versions become a promise to users and
need their own policy; or the maintainer deciding dates describe releases better than numbers.
