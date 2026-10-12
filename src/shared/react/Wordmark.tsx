import type { WordmarkModel } from '..';
import { SvgFrame, shapeId, type SvgFrameProps } from './SvgFrame';

/** The outlined two-line wordmark in wordmark space (cap top at y = 0). */
export function WordmarkShapes({ wordmark, idPrefix }: { wordmark: WordmarkModel; idPrefix?: string }) {
  return (
    <g id={shapeId(idPrefix, 'wordmark')}>
      {wordmark.shapes.map((shape) => (
        <path key={shape.id} id={shapeId(idPrefix, shape.id)} d={shape.d} fill={shape.fill} />
      ))}
    </g>
  );
}

export function Wordmark({
  wordmark,
  title = 'London TypeScript',
  idPrefix,
  ...frame
}: SvgFrameProps & { wordmark: WordmarkModel }) {
  return (
    <SvgFrame bounds={wordmark.bounds} title={title} {...frame}>
      <WordmarkShapes wordmark={wordmark} idPrefix={idPrefix} />
    </SvgFrame>
  );
}
