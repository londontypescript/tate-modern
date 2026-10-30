import { palette } from '../../shared/palette';
import { buildBubble, details, sphereDiameterInFrame, type Theme } from '../engine';
import { BubbleSvg } from '../react/BubbleSvg';
import { grounds, previewSizes } from './Previews';

const captionClass = (ground: string) =>
  `font-mono text-[11px] ${ground === palette.darkPage ? 'text-stone-400' : 'text-stone-500'}`;

/**
 * Every step forced at every size, so competing steps compare at the same
 * size, whatever the breakpoints choose.
 */
export function ForcedDetailGrid({ theme, lettering }: { theme: Theme; lettering: string }) {
  return (
    <div className="space-y-2">
      {grounds.map((g) => (
        <div
          key={g.name}
          className="overflow-x-auto rounded-lg border border-stone-200 p-4"
          style={{ backgroundColor: g.colour }}
        >
          <table>
            <thead>
              <tr>
                <th />
                {previewSizes.map((size) => (
                  <th key={size} className={`px-2 pb-2 align-bottom font-normal ${captionClass(g.colour)}`}>
                    {size} px
                    <br />⌀ {sphereDiameterInFrame(size).toFixed(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {details.map((detail) => {
                const drawing = buildBubble({ theme, detail, lettering });
                return (
                  <tr key={detail}>
                    <th className={`pr-4 text-left font-normal ${captionClass(g.colour)}`}>{detail}</th>
                    {previewSizes.map((size) => (
                      <td key={size} className="px-2 py-1.5 text-center align-bottom">
                        <BubbleSvg drawing={drawing} size={size} className="inline-block" />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/** Sizes GitHub shows an organisation's avatar at, from lists (20) to its own page. */
const avatarSizes = [20, 24, 32, 40, 48, 96] as const;

/**
 * Every step cropped to a circle, as GitHub shows avatars, on the theme's
 * page. The circle is the square frame's inscribed circle, so it trims only
 * what lies outside the sphere.
 */
export function AvatarCrops({ theme, lettering }: { theme: Theme; lettering: string }) {
  const ground = theme === 'light' ? palette.white : palette.darkPage;
  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 p-4" style={{ backgroundColor: ground }}>
      <table>
        <tbody>
          {details.map((detail) => {
            const drawing = buildBubble({ theme, detail, lettering });
            return (
              <tr key={detail}>
                <th className={`pr-4 text-left font-normal ${captionClass(ground)}`}>{detail}</th>
                {avatarSizes.map((size) => (
                  <td key={size} className="px-2 py-1.5 text-center align-bottom">
                    <div className="inline-block overflow-hidden rounded-full" style={{ width: size, height: size }}>
                      <BubbleSvg drawing={drawing} size={size} className="block" />
                    </div>
                    <div className={captionClass(ground)}>{size}</div>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
