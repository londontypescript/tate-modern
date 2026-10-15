import type { LogoConfig } from './engine';

/*
 * Earlier flat looks, kept so they always render as they did when chosen.
 * Every value is written out, colours as hex: nothing is taken from the
 * engine's defaults, the shared wordmark or the palette, which may all
 * change later without changing these. Fixtures in
 * `components/__fixtures__/` pin what each one draws.
 */

/**
 * The approved flat logo as the engine's defaults drew it from 12 October
 * 2026: the sheets even, the fade and the halo off.
 */
export const defaults12October: LogoConfig = {
  emblem: {
    layerCount: 6,
    rotationIncrement: 15,
    initialRotation: 7.5,
    squareSize: 158,
    sizeTaper: 0,
    cornerRadius: 1.6,
    opacity: 0.4,
    colours: ['#1678f0', '#5cbcff'],
    blendMode: 'multiply',
    fade: 0,
    fadeTurn: 137.5,
    fadeAngle: 0,
    fadeColour: '#5cbcff',
    rotationJitter: 0,
    sizeJitter: 0,
    aspectJitter: 0,
    offsetJitter: 0,
    seed: 1,
  },
  tile: {
    size: 100,
    cornerRadius: 0.8,
    colour: '#1688f0',
    facets: { apexX: 0.53, apexY: 0.38, top: 0.4, right: 0.04, bottom: -0.3, left: 0.08 },
    text: 'TS',
    textColour: '#ffffff',
    textScale: 0.35,
    textOffsetX: 0.07,
    textOffsetY: 0.06,
    letterSpacing: -0.01,
    halo: { strength: 0, reach: 14, offset: 5 },
  },
  wordmark: {
    lines: [
      { indent: 0.21, runs: [{ text: 'London', colour: '#000000' }] },
      {
        indent: 0,
        runs: [
          { text: 'Type', colour: '#000000' },
          { text: 'Script', colour: '#1275ec' },
        ],
      },
    ],
    lineSpacing: 0.72,
    letterSpacing: -0.06,
    condense: 0.92,
    flourishScale: 1,
  },
  layout: { horizontalGap: 0.14, background: '#fcf6e9' },
  animation: { speed: 1, baseVelocity: 4, variation: 0.6, alternateDirection: false },
};

/**
 * The irregular sheets of 14 October 2026, closer to the 2D mockup: larger,
 * stronger sheets varied by seed, one strong fade shared by every sheet,
 * and the halo lifting the tile. Otherwise the 12 October defaults.
 */
export const irregular14October: LogoConfig = {
  emblem: {
    layerCount: 6,
    rotationIncrement: 15,
    initialRotation: 7.5,
    squareSize: 175,
    sizeTaper: 0,
    cornerRadius: 1.6,
    opacity: 0.5,
    colours: ['#1678f0', '#5cbcff'],
    blendMode: 'multiply',
    fade: 0.55,
    fadeTurn: 0,
    fadeAngle: 315,
    fadeColour: '#5cbcff',
    rotationJitter: 12,
    sizeJitter: 0.15,
    aspectJitter: 0.12,
    offsetJitter: 8,
    seed: 7,
  },
  tile: {
    size: 100,
    cornerRadius: 0.8,
    colour: '#1688f0',
    facets: { apexX: 0.53, apexY: 0.38, top: 0.4, right: 0.04, bottom: -0.3, left: 0.08 },
    text: 'TS',
    textColour: '#ffffff',
    textScale: 0.35,
    textOffsetX: 0.07,
    textOffsetY: 0.06,
    letterSpacing: -0.01,
    halo: { strength: 0.4, reach: 14, offset: 5 },
  },
  wordmark: {
    lines: [
      { indent: 0.21, runs: [{ text: 'London', colour: '#000000' }] },
      {
        indent: 0,
        runs: [
          { text: 'Type', colour: '#000000' },
          { text: 'Script', colour: '#1275ec' },
        ],
      },
    ],
    lineSpacing: 0.72,
    letterSpacing: -0.06,
    condense: 0.92,
    flourishScale: 1,
  },
  layout: { horizontalGap: 0.14, background: '#fcf6e9' },
  animation: { speed: 1, baseVelocity: 4, variation: 0.6, alternateDirection: false },
};
