/**
 * The configurations the score's tests and evidence use, written out here
 * in full, never built from `defaultLogoConfig` or the studio's starters,
 * so a change to either can't change a test. Variants are built only from
 * the literals in this file, and every colour variable is spelled out.
 */
import type { BlendMode, LogoConfig } from '../../src/concepts/flat/engine';

const wordmark: LogoConfig['wordmark'] = {
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
};

/** The studio's "Irregular (14 Oct)" starter as it stood on 14 October 2026. */
export const irregular: LogoConfig = {
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
  wordmark,
  layout: { horizontalGap: 0.14, background: '#fcf6e9' },
  animation: { speed: 1, baseVelocity: 4, variation: 0.6, alternateDirection: false },
};

/** The studio's "MVP (11 Oct)" starter, the first flat logo. */
const mvp: LogoConfig = {
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

/** Every variable P2 searches, each required. */
interface ColourChoice {
  colours: readonly [string, string];
  fadeColour: string;
  opacity: number;
  blendMode: BlendMode;
  tileColour: string;
}

/** The Irregular geometry with the given colours: only P2's variables differ from `irregular`. */
const colourVariant = (c: ColourChoice): LogoConfig => ({
  ...irregular,
  emblem: {
    ...irregular.emblem,
    colours: [...c.colours],
    fadeColour: c.fadeColour,
    opacity: c.opacity,
    blendMode: c.blendMode,
  },
  tile: { ...irregular.tile, colour: c.tileColour },
});

const irregularColours: ColourChoice = {
  colours: ['#1678f0', '#5cbcff'],
  fadeColour: '#5cbcff',
  opacity: 0.5,
  blendMode: 'multiply',
  tileColour: '#1688f0',
};

/**
 * The renderer acceptance's candidates: normal and multiply blending, a
 * fade, the halo, palette changes of the kind P2 tries, and the MVP.
 */
export const acceptanceCandidates: readonly { label: string; config: LogoConfig }[] = [
  { label: 'irregular', config: irregular },
  { label: 'irregular-normal-blend', config: colourVariant({ ...irregularColours, blendMode: 'normal' }) },
  {
    label: 'irregular-no-halo',
    config: { ...irregular, tile: { ...irregular.tile, halo: { strength: 0, reach: 14, offset: 5 } } },
  },
  { label: 'irregular-no-fade', config: { ...irregular, emblem: { ...irregular.emblem, fade: 0 } } },
  { label: 'palette-sheets', config: colourVariant({ ...irregularColours, colours: ['#0a84ff', '#3cc8ff'] }) },
  { label: 'palette-fade', config: colourVariant({ ...irregularColours, fadeColour: '#ffffff', opacity: 0.6 }) },
  { label: 'palette-tile', config: colourVariant({ ...irregularColours, tileColour: '#0b7be8' }) },
  { label: 'mvp', config: mvp },
];
