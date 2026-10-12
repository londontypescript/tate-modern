import type { SliderControl } from '../../studio/ui';
import type { LogoConfig } from './engine';

const emblem = <K extends keyof LogoConfig['emblem']>(key: K) => ({
  get: (c: LogoConfig) => c.emblem[key] as number,
  set: (c: LogoConfig, v: number) => ({ ...c, emblem: { ...c.emblem, [key]: v } }),
});
const tile = <K extends keyof LogoConfig['tile']>(key: K) => ({
  get: (c: LogoConfig) => c.tile[key] as number,
  set: (c: LogoConfig, v: number) => ({ ...c, tile: { ...c.tile, [key]: v } }),
});
const wordmark = <K extends keyof LogoConfig['wordmark']>(key: K) => ({
  get: (c: LogoConfig) => c.wordmark[key] as number,
  set: (c: LogoConfig, v: number) => ({ ...c, wordmark: { ...c.wordmark, [key]: v } }),
});

export const controlGroups: { title: string; controls: SliderControl<LogoConfig>[] }[] = [
  {
    title: 'Squares',
    controls: [
      { label: 'Number of layers', min: 1, max: 16, step: 1, ...emblem('layerCount') },
      { label: 'Rotation increment', min: 0, max: 45, step: 0.5, unit: '°', ...emblem('rotationIncrement') },
      { label: 'Initial rotation', min: 0, max: 90, step: 0.5, unit: '°', ...emblem('initialRotation') },
      { label: 'Square size', min: 100, max: 200, step: 1, ...emblem('squareSize') },
      { label: 'Size taper', min: -0.4, max: 0.4, step: 0.01, ...emblem('sizeTaper') },
      { label: 'Corner radius', min: 0, max: 12, step: 0.1, ...emblem('cornerRadius') },
      { label: 'Layer opacity', min: 0.05, max: 1, step: 0.01, ...emblem('opacity') },
      { label: 'Fade across each square', min: 0, max: 1, step: 0.01, ...emblem('fade') },
      { label: 'Fade turn per square', min: 0, max: 180, step: 0.5, unit: '°', ...emblem('fadeTurn') },
      { label: 'First fade direction', min: 0, max: 360, step: 1, unit: '°', ...emblem('fadeAngle') },
    ],
  },
  {
    title: 'TS tile',
    controls: [
      { label: 'Letter size', min: 0.15, max: 0.5, step: 0.005, ...tile('textScale') },
      { label: 'Right margin', min: 0, max: 0.3, step: 0.005, ...tile('textOffsetX') },
      { label: 'Bottom margin', min: 0, max: 0.3, step: 0.005, ...tile('textOffsetY') },
      { label: 'Letter spacing', min: -0.1, max: 0.1, step: 0.005, unit: 'em', ...tile('letterSpacing') },
    ],
  },
  {
    title: 'Wordmark & layout',
    controls: [
      {
        label: 'Emblem–wordmark gap',
        min: 0,
        max: 0.6,
        step: 0.01,
        get: (c) => c.layout.horizontalGap,
        set: (c, v) => ({ ...c, layout: { ...c.layout, horizontalGap: v } }),
      },
      { label: 'Line spacing', min: 0.6, max: 1.2, step: 0.01, unit: 'em', ...wordmark('lineSpacing') },
      { label: 'Letter spacing', min: -0.08, max: 0.08, step: 0.005, unit: 'em', ...wordmark('letterSpacing') },
      { label: 'Condense letters', min: 0.7, max: 1.1, step: 0.01, unit: '×', ...wordmark('condense') },
      { label: 'Flourish scale', min: 0, max: 2, step: 0.05, ...wordmark('flourishScale') },
    ],
  },
  {
    title: 'Animation',
    controls: [
      {
        label: 'Speed',
        min: 0,
        max: 5,
        step: 0.1,
        unit: '×',
        get: (c) => c.animation.speed,
        set: (c, v) => ({ ...c, animation: { ...c.animation, speed: v } }),
      },
      {
        label: 'Speed variation',
        min: 0,
        max: 1,
        step: 0.05,
        get: (c) => c.animation.variation,
        set: (c, v) => ({ ...c, animation: { ...c.animation, variation: v } }),
      },
    ],
  },
];
