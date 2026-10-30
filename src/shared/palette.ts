/** The London TypeScript colours, shared by every concept. */
export const palette = {
  cream: '#fcf6e9',
  ink: '#000000',
  /** Bright TypeScript blue used for "Script" and the tile. */
  blue: '#1275ec',
  /** Translucent sheet fills, alternated back to front. */
  sheetBlue: '#1678f0',
  sheetSky: '#5cbcff',
  tileBlue: '#1688f0',
  white: '#ffffff',
  navy: '#06245c',
  /** The bubble's sunset fan, its panes from back to front. */
  sunsetPlum: '#2d1650',
  sunsetMagenta: '#8a2f6e',
  sunsetPink: '#ff5fa2',
  sunsetOrange: '#ff9a5c',
  sunsetGold: '#ffcf7a',
  /** The bubble's tile runs from this lighter blue to `blue`; on dark pages it is also the lifted "Script" blue. */
  liftedBlue: '#3d8bff',
  /** Ink on dark pages: GitHub's near-white, chosen over white and cream. */
  darkInk: '#f0f6fc',
  /** GitHub's dark page, the dark theme's ground. */
  darkPage: '#0d1117',
} as const;
