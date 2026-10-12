import type { Font } from 'opentype.js';
import { crossbarRight, flattenCommands, horizontalStrokeEnd, type StrokeJoin } from './outline';
import { palette } from './palette';
import type { Box, PathShape, Point, WordmarkModel } from './types';
import {
  capHeightRatio,
  curlShapes,
  emptyBox,
  layoutTextRun,
  translateBox,
  unionBox,
  xHeightRatio,
  type PlacedGlyph,
} from './typography';

/**
 * The two-line "London / TypeScript" wordmark, shared by every concept.
 * Typographic lengths (letter spacing, line spacing, indents) are in ems.
 */

export interface WordmarkRun {
  text: string;
  colour: string;
}

export interface WordmarkLine {
  runs: readonly WordmarkRun[];
  /** Horizontal indent of the line, in ems. */
  indent: number;
}

export interface WordmarkConfig {
  lines: readonly [WordmarkLine, WordmarkLine];
  /** Baseline-to-baseline distance, in ems. */
  lineSpacing: number;
  /** Extra space between letters, in ems. */
  letterSpacing: number;
  /** Size of the L flourish and the t terminal (1 = approved size). */
  flourishScale: number;
}

export const defaultWordmarkConfig: WordmarkConfig = {
  lines: [
    { indent: 0.1, runs: [{ text: 'London', colour: palette.ink }] },
    {
      indent: 0,
      runs: [
        { text: 'Type', colour: palette.ink },
        { text: 'Script', colour: palette.blue },
      ],
    },
  ],
  lineSpacing: 0.8,
  letterSpacing: -0.03,
  flourishScale: 1,
};

/**
 * Where the flourishes join their letters, measured from the glyph outlines
 * (lengths in cap heights). The L curl continues its top-left serif; the
 * t terminal continues the right end of its crossbar. Each curl starts
 * `overlap` inside the stroke's tip, at the stroke's own thickness.
 */
const flourishJoins = {
  /** Depth below the cap line at which the L's serif is probed. */
  serifProbe: 0.02,
  /** Distance right of the t's stem at which its crossbar is probed. */
  crossbarProbe: 0.03,
  overlap: 0.06,
  /** Used only if a glyph has no measurable stroke (e.g. other text). */
  fallbackWidth: 0.03,
} as const;

function serifJoin(glyph: PlacedGlyph, capHeight: number): StrokeJoin {
  const { serifProbe, overlap, fallbackWidth } = flourishJoins;
  const y = glyph.bounds.minY + serifProbe * capHeight;
  return (
    horizontalStrokeEnd(flattenCommands(glyph.commands), y, 'left', overlap * capHeight) ?? {
      origin: { x: glyph.bounds.minX + overlap * capHeight, y },
      thickness: fallbackWidth * capHeight,
      top: glyph.bounds.minY,
    }
  );
}

function crossbarJoin(glyph: PlacedGlyph, xHeight: number, capHeight: number): StrokeJoin {
  const { crossbarProbe, overlap, fallbackWidth } = flourishJoins;
  const midXHeight = glyph.baseline - xHeight / 2;
  return (
    crossbarRight(
      flattenCommands(glyph.commands),
      midXHeight,
      crossbarProbe * capHeight,
      overlap * capHeight,
    ) ?? {
      origin: { x: glyph.bounds.maxX - overlap * capHeight, y: glyph.baseline - xHeight },
      thickness: fallbackWidth * capHeight,
      top: glyph.baseline - xHeight,
    }
  );
}

/**
 * Lays out the two-line wordmark at `fontSize`. In wordmark space the top
 * of the capitals is y = 0 and the first line starts at x = 0.
 */
export function buildWordmark(config: WordmarkConfig, font: Font, fontSize: number): WordmarkModel {
  const capHeight = capHeightRatio(font) * fontSize;
  const baselines = [capHeight, capHeight + config.lineSpacing * fontSize] as const;
  const shapes: PathShape[] = [];
  const lineGlyphs: { glyph: PlacedGlyph; colour: string }[][] = [];

  config.lines.forEach((line, lineIndex) => {
    const placed: { glyph: PlacedGlyph; colour: string }[] = [];
    let x = line.indent * fontSize;
    let previous: ReturnType<Font['charToGlyph']> | undefined;
    for (const run of line.runs) {
      const layout = layoutTextRun(font, run.text, {
        x,
        baseline: baselines[lineIndex] as number,
        fontSize,
        letterSpacing: config.letterSpacing,
        previous,
      });
      for (const glyph of layout.glyphs) placed.push({ glyph, colour: run.colour });
      x = layout.endX;
      previous = font.stringToGlyphs(run.text).at(-1) ?? previous;
    }
    lineGlyphs.push(placed);
    placed.forEach(({ glyph, colour }, i) =>
      shapes.push({ id: `glyph-${lineIndex}-${i}-${glyph.char}`, d: glyph.d, fill: colour }),
    );
  });

  let bounds = lineGlyphs.flat().reduce((box, { glyph }) => unionBox(box, glyph.bounds), emptyBox());

  const first = lineGlyphs[0]?.[0];
  const last = lineGlyphs[1]?.at(-1);
  if (config.flourishScale > 0 && first && last) {
    const common = { capHeight, scale: config.flourishScale };
    const serif = serifJoin(first.glyph, capHeight);
    const lCurl = curlShapes('flourish-l', first.colour, {
      ...common,
      direction: -1,
      origin: serif.origin,
      rootWidth: serif.thickness,
    });
    const crossbar = crossbarJoin(last.glyph, xHeightRatio(font) * fontSize, capHeight);
    const tCurl = curlShapes('flourish-t', last.colour, {
      ...common,
      direction: 1,
      origin: crossbar.origin,
      rootWidth: crossbar.thickness,
    });
    shapes.push(...lCurl.shapes, ...tCurl.shapes);
    bounds = unionBox(bounds, unionBox(lCurl.bounds, tCurl.bounds));
  }

  return { shapes, bounds, capTop: 0, lastBaseline: baselines[1], fontSize };
}

/**
 * Font size at which the distance from the top of "London" to the baseline
 * of "TypeScript" equals `height`.
 */
export function wordmarkFontSizeForHeight(font: Font, lineSpacing: number, height: number): number {
  return height / (capHeightRatio(font) + lineSpacing);
}

export interface WordmarkPlacement {
  wordmark: WordmarkModel;
  /** Translation from wordmark space into the lockup's space. */
  offset: Point;
  /** The wordmark's ink bounds after the translation. */
  bounds: Box;
}

/**
 * Sets the wordmark beside an emblem for a horizontal lockup. The wordmark
 * is sized so that its cap top and last baseline span exactly `alignTop` to
 * `alignTop + alignHeight` (in the original logo, the tile's top and bottom
 * edges), then placed `gap` units to the right of `emblemBounds`.
 */
export function placeWordmark(
  config: WordmarkConfig,
  font: Font,
  frame: { emblemBounds: Box; alignTop: number; alignHeight: number; gap: number },
): WordmarkPlacement {
  const fontSize = wordmarkFontSizeForHeight(font, config.lineSpacing, frame.alignHeight);
  const wordmark = buildWordmark(config, font, fontSize);
  const offset = {
    x: frame.emblemBounds.maxX + frame.gap - wordmark.bounds.minX,
    y: frame.alignTop - wordmark.capTop,
  };
  return { wordmark, offset, bounds: translateBox(wordmark.bounds, offset.x, offset.y) };
}
