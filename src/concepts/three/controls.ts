import type { SliderControl } from '../../studio/ui';
import type { ThreeConfig } from './config';

type Section = 'stack' | 'slab' | 'material' | 'lighting' | 'camera' | 'motion';

/** A slider bound to `config[section][key]`. */
const field =
  <S extends Section>(section: S) =>
  <K extends keyof ThreeConfig[S]>(key: K) => ({
    get: (c: ThreeConfig) => c[section][key] as number,
    set: (c: ThreeConfig, v: number) => ({ ...c, [section]: { ...c[section], [key]: v } }),
  });

const stack = field('stack');
const slab = field('slab');
const material = field('material');
const lighting = field('lighting');
const camera = field('camera');
const motion = field('motion');

export const threeControlGroups: { title: string; controls: SliderControl<ThreeConfig>[] }[] = [
  {
    title: 'Stack',
    controls: [
      { label: 'Number of slabs', min: 1, max: 40, step: 1, ...stack('count') },
      { label: 'Turn per slab', min: -30, max: 30, step: 0.1, unit: '°', ...stack('rotateStep') },
      { label: 'Front slab scale', min: 0.1, max: 3, step: 0.01, ...stack('scaleStart') },
      { label: 'Growth per slab', min: -0.2, max: 0.4, step: 0.005, ...stack('scaleStep') },
      { label: 'Depth per slab', min: 0, max: 1, step: 0.01, ...stack('depthStep') },
      { label: 'Drift right per slab', min: -0.3, max: 0.3, step: 0.005, ...stack('offsetX') },
      { label: 'Drift up per slab', min: -0.3, max: 0.3, step: 0.005, ...stack('offsetY') },
      { label: 'Tilt forwards', min: -80, max: 80, step: 0.5, unit: '°', ...stack('tiltX') },
      { label: 'Tilt sideways', min: -80, max: 80, step: 0.5, unit: '°', ...stack('tiltY') },
      { label: 'Overall scale', min: 0.05, max: 3, step: 0.01, ...stack('scale') },
    ],
  },
  {
    title: 'Slab',
    controls: [
      { label: 'Thickness', min: 0.01, max: 0.6, step: 0.005, ...slab('depth') },
      { label: 'Bevel depth', min: 0, max: 0.4, step: 0.005, ...slab('bevelThickness') },
      { label: 'Bevel width', min: 0, max: 0.6, step: 0.005, ...slab('bevelSize') },
      { label: 'Bevel offset', min: -0.2, max: 0.6, step: 0.005, ...slab('bevelOffset') },
      { label: 'Bevel segments', min: 1, max: 12, step: 1, ...slab('bevelSegments') },
    ],
  },
  {
    title: 'Material',
    controls: [
      { label: 'Metalness', min: 0, max: 1, step: 0.01, ...material('metalness') },
      { label: 'Roughness', min: 0, max: 1, step: 0.005, ...material('roughness') },
      { label: 'Opacity', min: 0.05, max: 1, step: 0.01, ...material('opacity') },
      { label: 'Opacity lost per slab', min: 0, max: 0.2, step: 0.005, ...material('opacityFalloff') },
    ],
  },
  {
    title: 'Lighting',
    controls: [
      { label: 'Ambient', min: 0, max: 6, step: 0.05, ...lighting('ambient') },
      { label: 'Key lights', min: 0, max: 80, step: 0.5, ...lighting('key') },
      { label: 'Fill light', min: 0, max: 20, step: 0.1, ...lighting('fill') },
      { label: 'Key light direction', min: -180, max: 180, step: 1, unit: '°', ...lighting('keyAzimuth') },
      { label: 'Environment strength', min: 0, max: 4, step: 0.05, ...lighting('environmentIntensity') },
    ],
  },
  {
    title: 'Camera & motion',
    controls: [
      { label: 'Field of view', min: 10, max: 100, step: 0.5, unit: '°', ...camera('fov') },
      { label: 'Distance', min: 1, max: 30, step: 0.1, ...camera('distance') },
      { label: 'Spin speed', min: -20, max: 20, step: 0.1, unit: '°/s', ...motion('speed') },
    ],
  },
];
