import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * A logo concept the studio can show. Each one owns its configuration,
 * previews and controls; the studio supplies the layout, the reference
 * images and the switcher. Concepts load on demand, so a heavy one (such as
 * a 3D renderer) costs nothing until it is opened.
 */
export interface Concept {
  id: string;
  name: string;
  summary: string;
  Component: LazyExoticComponent<ComponentType>;
}

export const concepts: readonly Concept[] = [
  {
    id: 'flat',
    name: 'Flat',
    summary: 'Translucent squares rotated about a faceted tile: pure 2D SVG, the first MVP.',
    Component: lazy(() => import('../concepts/flat/FlatStudio')),
  },
  {
    id: 'three',
    name: '3D',
    summary: 'The original React Three Fiber sculpture: bevelled metal slabs, lit and rendered in real 3D.',
    Component: lazy(() => import('../concepts/three/ThreeStudio')),
  },
  {
    id: 'projected',
    name: 'Projected',
    summary: 'The 3D slabs drawn as flat SVG: projected through the same camera, shaded like the same material.',
    Component: lazy(() => import('../concepts/projected/ProjectedStudio')),
  },
];
