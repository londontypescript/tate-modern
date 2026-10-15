import { standaloneSvg } from '../../../shared/react/standaloneSvg';
import { Wordmark } from '../../../shared/react/Wordmark';
import type { LogoModel } from '../engine';
import { LondonTypeScriptLogo } from './LondonTypeScriptLogo';
import { TypeScriptMark } from './TypeScriptMark';

export type SvgVariant = 'mark' | 'wordmark' | 'logo';

export const svgVariants: readonly SvgVariant[] = ['mark', 'wordmark', 'logo'];

export interface RenderSvgOptions {
  /** Fill behind the artwork; transparent when omitted. */
  background?: string;
  /**
   * A fixed id prefix instead of one taken from the content: for the
   * historical fixtures, written with `lts`, and for tests that look shapes
   * up by their plain names.
   */
  idPrefix?: string;
}

/**
 * Renders one variant of the logo to a standalone SVG document, using the
 * same components as the live previews, with ids taken from its content
 * (see `standaloneSvg`). Used by the studio's download buttons and by
 * `scripts/generate-assets.ts`, so both write identical files.
 */
export function renderLogoSvg(variant: SvgVariant, logo: LogoModel, options: RenderSvgOptions = {}) {
  const { background } = options;
  return standaloneSvg(
    `flat/${variant}`,
    (idPrefix) =>
      ({
        mark: <TypeScriptMark emblem={logo.emblem} idPrefix={idPrefix} background={background} />,
        wordmark: <Wordmark wordmark={logo.wordmark} idPrefix={idPrefix} background={background} />,
        logo: <LondonTypeScriptLogo logo={logo} idPrefix={idPrefix} background={background} />,
      })[variant],
    options.idPrefix,
  );
}

export const svgFileName = (variant: SvgVariant) => `london-typescript-${variant}.svg`;
