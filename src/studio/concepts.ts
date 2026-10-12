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
];
