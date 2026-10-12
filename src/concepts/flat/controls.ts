import type { SliderControl } from '../../studio/ui';
import { emblemRanges, variationRanges, type LogoConfig } from './engine';

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
      { label: 'Number of layers', step: 1, ...emblemRanges.layerCount, ...emblem('layerCount') },
      {
        label: 'Rotation increment',
        step: 0.5,
        unit: '°',
        ...emblemRanges.rotationIncrement,
        ...emblem('rotationIncrement'),
      },
      {
        label: 'Initial rotation',
        step: 0.5,
        unit: '°',
        ...emblemRanges.initialRotation,
        ...emblem('initialRotation'),
      },
      { label: 'Square size', step: 1, ...emblemRanges.squareSize, ...emblem('squareSize') },
      { label: 'Size taper', step: 0.01, ...emblemRanges.sizeTaper, ...emblem('sizeTaper') },
      { label: 'Corner radius', step: 0.1, ...emblemRanges.cornerRadius, ...emblem('cornerRadius') },
      { label: 'Layer opacity', step: 0.01, ...emblemRanges.opacity, ...emblem('opacity') },
      { label: 'Fade across each square', step: 0.01, ...emblemRanges.fade, ...emblem('fade') },
      { label: 'Fade turn per square', step: 0.5, unit: '°', ...emblemRanges.fadeTurn, ...emblem('fadeTurn') },
      { label: 'First fade direction', step: 1, unit: '°', ...emblemRanges.fadeAngle, ...emblem('fadeAngle') },
    ],
  },
  {
    title: 'Sheet variation',
    controls: [
      { label: 'Uneven angles', step: 0.5, unit: '°', ...variationRanges.rotationJitter, ...emblem('rotationJitter') },
      { label: 'Uneven sizes', step: 0.01, ...variationRanges.sizeJitter, ...emblem('sizeJitter') },
      { label: 'Stretch from square', step: 0.01, ...variationRanges.aspectJitter, ...emblem('aspectJitter') },
      { label: 'Shift off centre', step: 0.5, ...variationRanges.offsetJitter, ...emblem('offsetJitter') },
      { label: 'Variation seed', step: 1, ...variationRanges.seed, ...emblem('seed') },
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
