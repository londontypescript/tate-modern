import { buildBubble, detailForDiameter, sphereDiameterInFrame, type Detail, type Theme } from '../engine';
import { BubbleSvg } from '../react/BubbleSvg';
import lightReferenceUrl from '../../../docs/references/bubble/emblem-light.svg?url';
import darkReferenceUrl from '../../../docs/references/bubble/emblem-dark.svg?url';
import { captionClass, groundName, homeGround, noteClass, strongClass } from './grounds';

const references: Record<Theme, string> = { light: lightReferenceUrl, dark: darkReferenceUrl };

/**
 * Square sizes, in CSS pixels, of the frame the emblem is seen in: the
 * common ones, and those just below, at and just above each breakpoint
 * (22 | 23, 29 | 30, 55 | 56).
 */
export const previewSizes = [16, 20, 22, 23, 24, 29, 30, 32, 48, 55, 56, 64, 96] as const;

const largeSize = 320;

/**
 * The detail a frame `size` CSS pixels wide gets: the size helper takes the
 * sphere's diameter where it is seen, which is a little under the frame's.
 */
const detailForFrame = (size: number): Detail => detailForDiameter(sphereDiameterInFrame(size));

interface PreviewProps {
  theme: Theme;
  /** The panel's colour, which the captions must stay readable on. */
  ground: string;
  lettering: string;
}

/**
 * The theme's drawing large on the ground, and on its own ground the
 * committed reference beside it.
 */
export function LargePreviews({ theme, ground, lettering }: PreviewProps) {
  const drawing = buildBubble({ theme, detail: 'full', lettering });
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <figure className="space-y-2">
        <BubbleSvg drawing={drawing} size={largeSize} className="h-auto max-w-full" />
        <figcaption className={noteClass(ground)}>
          <span className={strongClass(ground)}>Live, on {groundName(ground)}</span>
        </figcaption>
      </figure>
      {ground === homeGround[theme] && (
        <figure className="space-y-2">
          <img
            src={references[theme]}
            width={largeSize}
            height={largeSize}
            alt={`The committed ${theme} reference`}
            className="h-auto max-w-full"
          />
          <figcaption className={noteClass(ground)}>
            <span className={strongClass(ground)}>Reference</span> · docs/references/bubble/emblem-{theme}.svg, before
            the TS grew 1.3× (see its README)
          </figcaption>
        </figure>
      )}
    </div>
  );
}

/**
 * The drawing at real pixel sizes in one row, each labelled with its frame,
 * its sphere's diameter (⌀, what chooses the step) and the step it gets. It
 * wraps onto further lines in a half-width column, so every size stays in view.
 */
export function SizeRow({ theme, ground, lettering }: PreviewProps) {
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
      {previewSizes.map((size) => {
        const detail = detailForFrame(size);
        return (
          <figure key={size} className="flex flex-col items-center gap-1.5">
            <BubbleSvg drawing={buildBubble({ theme, detail, lettering })} size={size} />
            <figcaption className={`whitespace-nowrap ${captionClass(ground)}`}>
              {size} px · ⌀ {sphereDiameterInFrame(size).toFixed(1)} · {detail}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
