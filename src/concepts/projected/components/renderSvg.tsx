import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectedLogo, type ProjectedLockup } from './ProjectedLogo';
import { ProjectedMark } from './ProjectedMark';

export type ProjectedVariant = 'mark' | 'logo';

/** A standalone SVG document of the projected emblem or the full lockup. */
export function renderProjectedSvg(
  variant: ProjectedVariant,
  lockup: ProjectedLockup,
  options: { background?: string } = {},
) {
  const common = { idPrefix: 'lts', background: options.background };
  const element =
    variant === 'mark' ? (
      <ProjectedMark emblem={lockup.emblem} {...common} />
    ) : (
      <ProjectedLogo lockup={lockup} {...common} />
    );
  return `<?xml version="1.0" encoding="UTF-8"?>\n${renderToStaticMarkup(element)}\n`;
}

export const projectedFileName = (variant: ProjectedVariant) => `london-typescript-projected-${variant}.svg`;
