import { palette } from '../../shared';
import type { StarterConfig } from '../../studio/presets';
import { defaultLogoConfig, type LogoConfig } from './engine';

/**
 * The first flat logo, as approved on 11 October 2026 and exported for the
 * comparison with the ChatGPT original. Kept verbatim so later changes to
 * the defaults can always be compared against it.
 */
export const mvpLogoConfig: LogoConfig = {
  emblem: {
    layerCount: 6,
    rotationIncrement: 15,
    initialRotation: 7.5,
    squareSize: 145,
    sizeTaper: 0,
    cornerRadius: 1.6,
    opacity: 0.32,
    colours: [palette.sheetBlue, palette.sheetSky],
    blendMode: 'normal',
  },
  tile: {
    size: 100,
    cornerRadius: 0.8,
    colour: palette.tileBlue,
    facets: { apexX: 0.53, apexY: 0.38, top: 0.34, right: -0.04, bottom: -0.14, left: 0.1 },
    text: 'TS',
    textColour: palette.white,
    textScale: 0.32,
    textOffsetX: 0.07,
    textOffsetY: 0.06,
    letterSpacing: -0.01,
  },
  wordmark: {
    lines: [
      { indent: 0.1, runs: [{ text: 'London', colour: '#0e0e10' }] },
      {
        indent: 0,
        runs: [
          { text: 'Type', colour: '#0e0e10' },
          { text: 'Script', colour: palette.blue },
        ],
      },
    ],
    lineSpacing: 0.8,
    letterSpacing: -0.03,
    flourishScale: 1,
  },
  layout: { horizontalGap: 0.14, background: palette.cream },
  animation: { speed: 1, baseVelocity: 4, variation: 0.6, alternateDirection: false },
};

export const flatStarters: readonly StarterConfig<LogoConfig>[] = [
  { name: 'Current defaults', description: 'The approved flat logo in config.ts', config: defaultLogoConfig },
  { name: 'MVP (11 Oct)', description: 'The first flat logo, before the comparison fixes', config: mvpLogoConfig },
];
