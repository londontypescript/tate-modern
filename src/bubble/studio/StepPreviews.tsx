import { buildBubble, details, sphereDiameterInFrame, type Theme } from '../engine';
import { BubbleSvg } from '../react/BubbleSvg';
import { captionClass } from './grounds';
import { previewSizes } from './Previews';

interface StepProps {
  theme: Theme;
  /** The panel's colour, which the captions must stay readable on. */
  ground: string;
  lettering: string;
}

/**
 * Every step forced at every size, so competing steps compare at the same
 * size, whatever the breakpoints choose.
 */
export function ForcedDetailGrid({ theme, ground, lettering }: StepProps) {
  return (
    <table>
      <thead>
        <tr>
          <th />
          {previewSizes.map((size) => (
            <th key={size} className={`px-2 pb-2 align-bottom font-normal whitespace-nowrap ${captionClass(ground)}`}>
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
              <th className={`pr-4 text-left font-normal ${captionClass(ground)}`}>{detail}</th>
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
  );
}

/** Sizes GitHub shows an organisation's avatar at, from lists (20) to its own page. */
const avatarSizes = [20, 24, 32, 40, 48, 96] as const;

/**
 * Every step cropped to a circle, as GitHub shows people's avatars (an
 * organisation's are rounded squares, as the slot previews show). The circle
 * is the square frame's inscribed circle, so it trims only what lies outside
 * the sphere.
 */
export function AvatarCrops({ theme, ground, lettering }: StepProps) {
  return (
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
  );
}
