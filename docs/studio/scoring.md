# Scoring the flat emblem

`pnpm score <configs.json> [--json]` ranks flat logo configurations by how close their static mark's colours are to
the ChatGPT original. It exists so that P2 of [the 0.3.0 plan](../plans/0.3.0.md) can search colours and show the
maintainer only the best two or three. The code is in `scripts/score/`.

## What it compares

- **The reference** is committed in `scripts/score/reference/` (its README says how it was made): the original's mark
  on a fixed 1120 × 1120 canvas (the original's pixels on flat `#fef7ea` padding) and a mask of its sheets, tile and
  background.
- **Each candidate** is the studio's own SVG export of the mark, placed so its tile's centre lands on the original
  tile's centre and its side equals the geometric mean of the original tile's width and height, then drawn by resvg
  at 1:1. Art that falls outside the canvas is clipped and makes a candidate ineligible.

## The numbers

All in CIEDE2000 (sRGB, D65), pixel by pixel against the reference:

- `sheets` and `tile`: the mean over each region of the reference.
- `spill`: the sum over the reference's background, divided by the number of sheet pixels.
- `objective = sheets + spill + wTile × tile`. Lower is closer.
- `iou`: how much the candidate's silhouette overlaps the original's. **A diagnostic only.**

Candidates within the tie tolerance of their group's best objective are shown as ties. The parameters are frozen in
`scripts/score/parameters.ts`; `--json` prints them with the versions, hashes and source revision behind a result.

## What decides eligibility, and what doesn't

P2 searches colours on one frozen geometry (`frozen` in `scripts/score/fixtures.ts`: the Irregular starter with its
sheets at size 150, the maintainer's choice). A candidate is eligible only if:

- it differs from `frozen` in nothing but `emblem.colours`, `emblem.fadeColour`, `emblem.opacity`,
  `emblem.blendMode` and `tile.colour`, checked field by field; and
- none of its art is clipped.

**The score does not judge visible damage.** A colouring can make the emblem look broken (sheets fading into the
cream, an opacity extreme) and still score well. That judgement is the maintainer's: at Checkpoint B, and on P2's
shortlist, always at true registered scale. A real shape guardrail returns if geometry is ever searched.

## Renderer acceptance

resvg was accepted against the installed Google Chrome by `pnpm score --acceptance <folder>`, on the frozen geometry
with fresh colourings: per-region pixel limits, the same eligibility, each objective within 0.2 between the
renderers, and the same order for every pair further apart than their two differences. Tie groups are reported, not
required to match. Rerun it after any change to rendering.
