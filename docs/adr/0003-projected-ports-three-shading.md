# ADR 0003: The projected concept ports three.js's shading

Date: 2026-10-12. Status: accepted.

## Context

The 3D concept (0d23f1b) renders the logo's glass slabs with three.js through WebGL, which gives
the sculpture its depth and light but produces a bitmap. The flat concept is vector but has no
depth. The projected concept (b4d22b3) is meant to be a vector logo with the 3D sculpture's depth
and light, exported as SVG.

Drawing polygons in SVG means working out each face's colour ourselves. The options were to render
through WebGL and trace or embed the result, or to compute the colours in plain code. The history
doesn't record that tracing or embedding a render was considered, or why it was ruled out.

## Decision

The projected concept doesn't render through WebGL. It is a small framework-free renderer in
`src/concepts/projected/engine/` that builds each slab's faces as three's `ExtrudeGeometry` builds
its bevel, places them with the 3D concept's own stacking rule, culls faces turned away, projects
them through the same perspective camera and sorts slabs back to front as three sorts transparent
objects.

`shading.ts` ports the formulas that set a pixel's colour in three.js: `MeshStandardMaterial`'s
Lambert diffuse and GGX specular, ACES filmic tone mapping and sRGB encoding. Porting the formulas
rather than approximating the look is meant to make a face come out the colour the 3D render gives
it; the studio can show the live 3D render beside the projection to check this. The port keeps
three.js's MIT licence notice in the file, and the README credits it.

Environment reflections are not modelled, so the projected concept takes the 3D concept's settings
minus those.

## What would end it

The projected output drifting from the 3D render in a way the ported formulas can't fix, for example
a need for reflections; a three.js change to its shading that the port should follow, or the port
becoming too costly to keep in step; or SVG export no longer being wanted.
