import type { StarterConfig } from '../../studio/presets';
import { defaultLogoConfig, type LogoConfig } from './engine';

/**
 * The first flat logo, as approved on 11 October 2026 and exported for the
 * comparison with the ChatGPT original. Kept verbatim, colours included, so
 * later changes to the defaults and palette can always be compared with it.
 */
const mvpLogoConfig: LogoConfig = {
  emblem: {
    layerCount: 6,
    rotationIncrement: 15,
    initialRotation: 7.5,
    squareSize: 145,
    sizeTaper: 0,
    cornerRadius: 1.6,
    opacity: 0.32,
    colours: ['#1a8cf5', '#4fb0fa'],
    blendMode: 'normal',
    fade: 0,
    fadeTurn: 137.5,
    fadeAngle: 0,
    fadeColour: '#4fb0fa',
    // Sheet variation came later; off, so the MVP stays exactly as approved.
    rotationJitter: 0,
    sizeJitter: 0,
    aspectJitter: 0,
    offsetJitter: 0,
    seed: 1,
  },
  tile: {
    size: 100,
    cornerRadius: 0.8,
    colour: '#1592f2',
    facets: { apexX: 0.53, apexY: 0.38, top: 0.34, right: -0.04, bottom: -0.14, left: 0.1 },
    text: 'TS',
    textColour: '#ffffff',
    textScale: 0.32,
    textOffsetX: 0.07,
    textOffsetY: 0.06,
    letterSpacing: -0.01,
    // The halo came later; off, so the MVP stays exactly as approved.
    halo: { strength: 0, reach: 14, offset: 5 },
  },
  wordmark: {
    lines: [
      { indent: 0.1, runs: [{ text: 'London', colour: '#0e0e10' }] },
      {
        indent: 0,
        runs: [
          { text: 'Type', colour: '#0e0e10' },
          { text: 'Script', colour: '#1275ec' },
        ],
      },
    ],
    lineSpacing: 0.8,
    letterSpacing: -0.03,
    condense: 1,
    flourishScale: 1,
  },
  layout: { horizontalGap: 0.14, background: '#fcf6e9' },
  animation: { speed: 1, baseVelocity: 4, variation: 0.6, alternateDirection: false },
};

/**
 * Starting points closer to the ChatGPT original than the defaults: one
 * strong fade shared by every sheet, sheets varied by seed so the
 * arrangement looks irregular rather than formulaic, and the halo lifting
 * the tile. Built on the defaults, which stay as approved.
 */
const irregularSheets = (squareSize: number, opacity: number): LogoConfig => ({
  ...defaultLogoConfig,
  emblem: {
    ...defaultLogoConfig.emblem,
    squareSize,
    opacity,
    fade: 0.55,
    fadeTurn: 0,
    fadeAngle: 315,
    rotationJitter: 12,
    sizeJitter: 0.15,
    aspectJitter: 0.12,
    offsetJitter: 8,
    seed: 7,
  },
  tile: { ...defaultLogoConfig.tile, halo: { strength: 0.4, reach: 14, offset: 5 } },
});

export const flatStarters: readonly StarterConfig<LogoConfig>[] = [
  { name: 'Current defaults', description: 'The approved flat logo in config.ts', config: defaultLogoConfig },
  { name: 'MVP (11 Oct)', description: 'The first flat logo, before the comparison fixes', config: mvpLogoConfig },
  {
    name: 'Irregular, bold (14 Oct)',
    description: 'Bigger, stronger irregular sheets with a fade and the halo',
    config: irregularSheets(175, 0.5),
  },
  {
    name: 'Irregular (14 Oct)',
    description: 'Irregular sheets at the default size, with a fade and the halo',
    config: irregularSheets(158, 0.4),
  },
];
