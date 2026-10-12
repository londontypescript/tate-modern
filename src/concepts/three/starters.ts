import type { StarterConfig } from '../../studio/presets';
import { defaultThreeConfig, type ThreeConfig } from './config';

const RAD = 180 / Math.PI;
const d = defaultThreeConfig;

/** Arrangements found in the original prototypes, to start from. */
export const threeStarters: readonly StarterConfig<ThreeConfig>[] = [
  {
    name: 'Site stack (Mar 2026)',
    description: 'The visible stack in londontypescript/site: 30 slabs fanned and growing into the distance',
    config: d,
  },
  {
    name: 'Scrambled (Mar 2026)',
    description: 'The same stack with the fixed scrambled angles the prototype ended on',
    config: { ...d, stack: { ...d.stack, scramble: true } },
  },
  {
    name: 'Turned deck (Mar 2026)',
    description: 'The hidden second group in the same prototype: larger slabs turning the other way, tilted to the side',
    config: {
      ...d,
      stack: { ...d.stack, rotateStep: -0.15 * RAD, scaleStart: 1.25, scaleStep: 0.15, tiltY: 0.5 * RAD, scale: 0.25 },
      lettering: { ...d.lettering, show: true },
    },
  },
  {
    name: 'Studio reflections',
    description: 'The site stack lit by drei’s studio environment as well as the four lights',
    config: { ...d, lighting: { ...d.lighting, environment: 'studio' } },
  },
  {
    name: 'Chaquejour logo (Sep 2025)',
    description:
      'The earlier 7-slab experiment: chunkier bevels, 10° turns, each slab fainter towards the back, studio reflections',
    config: {
      ...d,
      stack: { ...d.stack, count: 7, rotateStep: 10, scaleStart: 1, scaleStep: 0.25, depthStep: 1, scale: 0.6 },
      slab: { ...d.slab, depth: 0.25, bevelThickness: 0.25, bevelSize: 0.5, bevelOffset: 0, depthFollowsScale: false },
      material: { colour: '#1e90ff', metalness: 0.9, roughness: 0.3, opacity: 1, opacityFalloff: 0.1 },
      lighting: { ...d.lighting, environment: 'studio' },
    },
  },
];
