import type { Font } from 'opentype.js';
import { placeWordmark, unionBox, type Box, type WordmarkConfig, type WordmarkPlacement } from '../../../shared';
import { SvgFrame, num, type SvgFrameProps } from '../../../shared/react/SvgFrame';
import { WordmarkShapes } from '../../../shared/react/Wordmark';
import type { ProjectedEmblem, ProjectionConfig } from '../engine';
import { ProjectedShapes } from './ProjectedMark';

export interface ProjectedLockup {
  emblem: ProjectedEmblem;
  wordmark: WordmarkPlacement;
  bounds: Box;
}

/**
 * Sets the shared wordmark beside the projected emblem: its cap-top-to-
 * baseline height is `wordmarkHeight` of the emblem's, centred on it.
 */
export function buildProjectedLockup(
  emblem: ProjectedEmblem,
  wordmark: WordmarkConfig,
  font: Font,
  projection: ProjectionConfig,
): ProjectedLockup {
  const height = emblem.bounds.maxY - emblem.bounds.minY;
  const alignHeight = height * projection.wordmarkHeight;
  const placed = placeWordmark(wordmark, font, {
    emblemBounds: emblem.bounds,
    alignTop: (emblem.bounds.minY + emblem.bounds.maxY) / 2 - alignHeight / 2,
    alignHeight,
    gap: height * projection.wordmarkGap,
  });
  return { emblem, wordmark: placed, bounds: unionBox(emblem.bounds, placed.bounds) };
}

export function ProjectedLogo({
  lockup,
  title = 'London TypeScript',
  idPrefix,
  ...frame
}: SvgFrameProps & { lockup: ProjectedLockup }) {
  const { x, y } = lockup.wordmark.offset;
  return (
    <SvgFrame bounds={lockup.bounds} title={title} {...frame}>
      <ProjectedShapes emblem={lockup.emblem} idPrefix={idPrefix} />
      <g transform={`translate(${num(x)} ${num(y)})`}>
        <WordmarkShapes wordmark={lockup.wordmark.wordmark} idPrefix={idPrefix} />
      </g>
    </SvgFrame>
  );
}
