/** Images the concepts are compared against, served from public/references. */
export interface Reference {
  id: string;
  name: string;
  description: string;
  src: string;
  /** Background behind the image, so its own margins blend in. */
  background: string;
}

export const references: readonly Reference[] = [
  {
    id: 'chatgpt-original',
    name: 'ChatGPT original',
    description: 'The raster logo ChatGPT painted from the Three.js concepts: the look the flat logo set out to match.',
    src: '/references/chatgpt-original.webp',
    background: '#fcf6e9',
  },
  {
    id: 'three-stack',
    name: 'Three.js stack',
    description: 'The original hand-built React Three Fiber concept: bevelled metal slabs fanned behind a "Ts" tile.',
    src: '/references/three-stack.png',
    background: '#ffffff',
  },
  {
    id: 'three-hero',
    name: 'Three.js hero',
    description: 'A website hero from the same concept: slabs in strong perspective, lit from the right.',
    src: '/references/three-hero.png',
    background: '#ffffff',
  },
  {
    id: 'flat-mvp',
    name: 'Flat MVP',
    description: 'The first flat SVG logo from this repository, exported on 12 October 2026.',
    src: '/references/flat-mvp.png',
    background: '#fcf6e9',
  },
];
