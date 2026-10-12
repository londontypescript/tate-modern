# ADR 0003: The projected concept ports three.js's shading

Date: 2026-10-12. Status: accepted.

## Context

The 3D concept (0d23f1b) renders the logo's glass slabs with three.js through WebGL, which gives
the sculpture its depth and light but produces a bitmap. The flat concept is vector but has no
depth. The projected concept (b4d22b3) is meant to be a vector logo with the 3D sculpture's depth
and light, exported as SVG.

Drawing polygons in SVG means working out each face's colour ourselves. The alternative was to keep
three.js drawing and use its picture: trace the bitmap into shapes, or embed it in an SVG. Both go
against the studio's aim that every shape comes from parameters rather than pixels (README): a
trace loses the parameters and comes out approximate, and an embedded bitmap doesn't scale. The
approach was chosen by the session that built the concept, without the maintainer being asked; this
ADR records it after the fact.

## Decision

The projected concept doesn't render through WebGL. It is a small framework-free renderer in
`src/concepts/projected/engine/` that builds each slab's faces as three's `ExtrudeGeometry` builds
its bevel, places them with the 3D concept's own stacking rule, culls faces turned away, projects
them through the same perspective camera and sorts slabs back to front as three sorts transparent
objects.

`shading.ts` ports the formulas that set a pixel's colour in three.js: `MeshStandardMaterial`'s
Lambert diffuse and GGX specular, ACES filmic tone mapping and sRGB encoding. Porting the formulas
rather than approximating the look makes a face come out the colour the 3D render gives it; the
studio can show the live 3D render beside the projection to check this. The maintainer has since
compared the two and endorses the approach: it is complex, but its output is much closer to the 3D
render than an approximation would be. The port keeps three.js's MIT licence notice in the file, and
the README credits it.

Environment reflections are not modelled, so the projected concept takes the 3D concept's settings
minus those.

## What would end it

The projected output drifting from the 3D render in a way the ported formulas can't fix, for example
a need for reflections; a three.js change to its shading that the port should follow, or the port
becoming too costly to keep in step; or SVG export no longer being wanted.
