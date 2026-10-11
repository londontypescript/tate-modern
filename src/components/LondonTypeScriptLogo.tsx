import type { LogoModel } from '../logo';
import { SvgFrame, num, type SvgFrameProps } from './SvgFrame';
import { MarkShapes } from './TypeScriptMark';
import { WordmarkShapes } from './Wordmark';

export interface LondonTypeScriptLogoProps extends SvgFrameProps {
  logo: LogoModel;
  rotations?: readonly number[];
  framing?: 'tight' | 'rotation-safe';
}

/** The complete horizontal logo: emblem on the left, wordmark on the right. */
export function LondonTypeScriptLogo({
  logo,
  rotations,
  framing = 'tight',
  title = 'London TypeScript',
  idPrefix,
  ...frame
}: LondonTypeScriptLogoProps) {
  const bounds = framing === 'tight' ? logo.bounds : logo.rotationSafeBounds;
  const { x, y } = logo.wordmarkOffset;
  return (
    <SvgFrame bounds={bounds} title={title} {...frame}>
      <MarkShapes emblem={logo.emblem} rotations={rotations} idPrefix={idPrefix} />
      <g transform={`translate(${num(x)} ${num(y)})`}>
        <WordmarkShapes wordmark={logo.wordmark} idPrefix={idPrefix} />
      </g>
    </SvgFrame>
  );
}
