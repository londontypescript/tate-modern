import { standaloneSvg } from '../../../shared/react/standaloneSvg';
import { ProjectedLogo, type ProjectedLockup } from './ProjectedLogo';
import { ProjectedMark } from './ProjectedMark';

export type ProjectedVariant = 'mark' | 'logo';

/**
 * A standalone SVG document of the projected emblem or the full lockup, with
 * ids taken from its content (see `standaloneSvg`). `idPrefix` fixes the
 * prefix instead, for tests that look shapes up by their plain names.
 */
export function renderProjectedSvg(
  variant: ProjectedVariant,
  lockup: ProjectedLockup,
  options: { background?: string; idPrefix?: string } = {},
) {
  const { background } = options;
  return standaloneSvg(
    `projected/${variant}`,
    (idPrefix) =>
      variant === 'mark' ? (
        <ProjectedMark emblem={lockup.emblem} idPrefix={idPrefix} background={background} />
      ) : (
        <ProjectedLogo lockup={lockup} idPrefix={idPrefix} background={background} />
      ),
    options.idPrefix,
  );
}

export const projectedFileName = (variant: ProjectedVariant) => `london-typescript-projected-${variant}.svg`;
