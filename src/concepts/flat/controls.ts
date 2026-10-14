import type { SliderControl } from '../../studio/ui';
import {
  animationRanges,
  emblemRanges,
  haloRanges,
  layoutRanges,
  tileRanges,
  variationRanges,
  wordmarkRanges,
  type HaloConfig,
  type LogoConfig,
} from './engine';

const emblem = <K extends keyof LogoConfig['emblem']>(key: K) => ({
  get: (c: LogoConfig) => c.emblem[key] as number,
  set: (c: LogoConfig, v: number) => ({ ...c, emblem: { ...c.emblem, [key]: v } }),
});
const tile = <K extends keyof LogoConfig['tile']>(key: K) => ({
  get: (c: LogoConfig) => c.tile[key] as number,
  set: (c: LogoConfig, v: number) => ({ ...c, tile: { ...c.tile, [key]: v } }),
});
const halo = (key: keyof HaloConfig) => ({
  get: (c: LogoConfig) => c.tile.halo[key],
  set: (c: LogoConfig, v: number) => ({ ...c, tile: { ...c.tile, halo: { ...c.tile.halo, [key]: v } } }),
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
    title: 'Halo',
    controls: [
      { label: 'Halo strength', step: 0.01, ...haloRanges.strength, ...halo('strength') },
      { label: 'Halo reach', step: 0.5, ...haloRanges.reach, ...halo('reach') },
      { label: 'Shadow offset', step: 0.5, ...haloRanges.offset, ...halo('offset') },
    ],
  },
  {
    title: 'TS tile',
    controls: [
      { label: 'Letter size', step: 0.005, ...tileRanges.textScale, ...tile('textScale') },
      { label: 'Right margin', step: 0.005, ...tileRanges.textOffsetX, ...tile('textOffsetX') },
      { label: 'Bottom margin', step: 0.005, ...tileRanges.textOffsetY, ...tile('textOffsetY') },
      { label: 'Letter spacing', step: 0.005, unit: 'em', ...tileRanges.letterSpacing, ...tile('letterSpacing') },
    ],
  },
  {
    title: 'Wordmark & layout',
    controls: [
      {
        label: 'Emblem–wordmark gap',
        step: 0.01,
        ...layoutRanges.horizontalGap,
        get: (c) => c.layout.horizontalGap,
        set: (c, v) => ({ ...c, layout: { ...c.layout, horizontalGap: v } }),
      },
      { label: 'Line spacing', step: 0.01, unit: 'em', ...wordmarkRanges.lineSpacing, ...wordmark('lineSpacing') },
      {
        label: 'Letter spacing',
        step: 0.005,
        unit: 'em',
        ...wordmarkRanges.letterSpacing,
        ...wordmark('letterSpacing'),
      },
      { label: 'Condense letters', step: 0.01, unit: '×', ...wordmarkRanges.condense, ...wordmark('condense') },
      { label: 'Flourish scale', step: 0.05, ...wordmarkRanges.flourishScale, ...wordmark('flourishScale') },
    ],
  },
  {
    title: 'Animation',
    controls: [
      {
        label: 'Speed',
        step: 0.1,
        ...animationRanges.speed,
        unit: '×',
        get: (c) => c.animation.speed,
        set: (c, v) => ({ ...c, animation: { ...c.animation, speed: v } }),
      },
      {
        label: 'Speed variation',
        step: 0.05,
        ...animationRanges.variation,
        get: (c) => c.animation.variation,
        set: (c, v) => ({ ...c, animation: { ...c.animation, variation: v } }),
      },
    ],
  },
];
