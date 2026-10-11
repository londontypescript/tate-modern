import { renderToStaticMarkup } from 'react-dom/server';
import type { LogoModel } from '../logo';
import { LondonTypeScriptLogo } from './LondonTypeScriptLogo';
import { TypeScriptMark } from './TypeScriptMark';
import { Wordmark } from './Wordmark';

export type SvgVariant = 'mark' | 'wordmark' | 'logo';

export const svgVariants: readonly SvgVariant[] = ['mark', 'wordmark', 'logo'];

export interface RenderSvgOptions {
  /** Fill behind the artwork; transparent when omitted. */
  background?: string;
}

/**
 * Renders one variant of the logo to a standalone SVG document, using the
 * same components as the live previews. Used by the playground's download
 * buttons and by `scripts/generate-assets.ts`.
 */
export function renderLogoSvg(variant: SvgVariant, logo: LogoModel, options: RenderSvgOptions = {}) {
  const common = { idPrefix: 'lts', background: options.background };
  const element = {
    mark: <TypeScriptMark emblem={logo.emblem} {...common} />,
    wordmark: <Wordmark wordmark={logo.wordmark} {...common} />,
    logo: <LondonTypeScriptLogo logo={logo} {...common} />,
  }[variant];
  return `<?xml version="1.0" encoding="UTF-8"?>\n${renderToStaticMarkup(element)}\n`;
}

export const svgFileName = (variant: SvgVariant) => `london-typescript-${variant}.svg`;
