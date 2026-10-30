import type { ReactNode } from 'react';
import { palette } from '../../shared/palette';
import {
  buildBubble,
  detailForDiameter,
  sphereDiameterInFrame,
  type BubbleDrawing,
  type Detail,
  type Theme,
} from '../engine';
import { BubbleSvg } from '../react/BubbleSvg';
import lightReferenceUrl from '../../../docs/references/bubble/emblem-light.svg?url';
import darkReferenceUrl from '../../../docs/references/bubble/emblem-dark.svg?url';

/** The two grounds every drawing is judged on: white, and GitHub's dark page. */
export const grounds = [
  { name: 'white', colour: palette.white },
  { name: palette.darkPage, colour: palette.darkPage },
] as const;

/** The ground each theme is drawn for. */
const homeGround: Record<Theme, string> = { light: palette.white, dark: palette.darkPage };

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

function Card({
  label,
  note,
  ground,
  children,
}: {
  label: string;
  note?: string;
  ground: string;
  children: ReactNode;
}) {
  return (
    <figure className="space-y-2">
      <div
        className="flex items-center justify-center rounded-lg border border-stone-200 p-4"
        style={{ backgroundColor: ground }}
      >
        {children}
      </div>
      <figcaption className="text-xs text-stone-600">
        <span className="font-medium text-stone-800">{label}</span>
        {note && <span> · {note}</span>}
      </figcaption>
    </figure>
  );
}

/** The theme's drawing large, on both grounds, beside the committed reference on its own ground. */
export function LargePreviews({ drawing }: { drawing: BubbleDrawing }) {
  const theme = drawing.theme;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {grounds.map((g) => (
        <Card
          key={g.name}
          label={`Live, on ${g.name}`}
          note={g.colour === homeGround[theme] ? 'drawn for this ground' : undefined}
          ground={g.colour}
        >
          <BubbleSvg drawing={drawing} size={largeSize} className="h-auto max-w-full" />
        </Card>
      ))}
      <Card
        label="Reference"
        note={`docs/references/bubble/emblem-${theme}.svg, before the TS grew 1.3× (see its README)`}
        ground={homeGround[theme]}
      >
        <img
          src={references[theme]}
          width={largeSize}
          height={largeSize}
          alt={`The committed ${theme} reference`}
          className="h-auto max-w-full"
        />
      </Card>
    </div>
  );
}

/**
 * The drawing at real pixel sizes on both grounds, each labelled with its
 * frame, its sphere's diameter (⌀, what chooses the step) and the step it gets.
 */
export function SizeRow({ theme, lettering }: { theme: Theme; lettering: string }) {
  return (
    <div className="space-y-2">
      {grounds.map((g) => (
        <div
          key={g.name}
          className="flex flex-wrap items-end gap-6 rounded-lg border border-stone-200 p-4"
          style={{ backgroundColor: g.colour }}
        >
          {previewSizes.map((size) => {
            const detail = detailForFrame(size);
            return (
              <figure key={size} className="flex flex-col items-center gap-1.5">
                <BubbleSvg drawing={buildBubble({ theme, detail, lettering })} size={size} />
                <figcaption
                  className={`font-mono text-[11px] ${g.colour === palette.darkPage ? 'text-stone-400' : 'text-stone-500'}`}
                >
                  {size} px · ⌀ {sphereDiameterInFrame(size).toFixed(1)} · {detail}
                </figcaption>
              </figure>
            );
          })}
        </div>
      ))}
    </div>
  );
}
