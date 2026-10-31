import { boxSize, buildBubble, detailForDiameter, sphereDiameterInFrame, type Theme } from '../engine';
import { BubbleSvg } from '../react/BubbleSvg';
import { BubbleLockupSvg } from '../wordmark/BubbleWordmark';
import type { KernedFont } from '../wordmark/fonts';
import { layoutBubbleLockup } from '../wordmark/lockup';

/**
 * Emblem sizes in CSS pixels: the reference lockup's header size (56) and
 * its large one (110).
 */
const lockupSizes = [110, 56] as const;

/** The stacked lockup at real sizes, on the panel of its theme's own ground. */
export function LockupPreviews({ theme, font, lettering }: { theme: Theme; font: KernedFont; lettering: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-12 gap-y-6">
      {lockupSizes.map((size) => {
        const lockup = layoutBubbleLockup(font, { emblemSize: size, theme });
        const drawing = buildBubble({ theme, detail: detailForDiameter(sphereDiameterInFrame(size)), lettering });
        return (
          <div key={size} style={{ width: lockup.box.maxX }}>
            <BubbleLockupSvg
              lockup={lockup}
              title={`London TypeScript lockup, ${theme} theme, ${size} px emblem`}
              emblem={{
                side: boxSize,
                content: <BubbleSvg drawing={drawing} size={boxSize} />,
                paintedBounds: drawing.frame,
              }}
              className="block h-auto w-full"
            />
          </div>
        );
      })}
    </div>
  );
}
