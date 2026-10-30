import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk } from '../../../scripts/node-fonts';
import { standaloneSvg } from '../../shared/react/standaloneSvg';
import { BubbleLockupSvg, BubbleWordmarkSvg } from './BubbleWordmark';
import type { BubbleFonts } from './fonts';
import { layoutBubbleLockup } from './lockup';
import { buildBubbleWordmark } from './wordmark';

let fonts: BubbleFonts;
beforeAll(async () => {
  fonts = await loadBubbleFontsFromDisk();
});

describe('the lockup', () => {
  it('uses the reference numbers at a 56 emblem', () => {
    const lockup = layoutBubbleLockup(fonts.wordmark, { emblemSize: 56, theme: 'light' });
    expect(lockup.wordmark.fontSize).toBeCloseTo(22.4);
    expect(lockup.offset.x).toBeCloseTo(56 + 10);
    expect(lockup.wordmark.baselines[1] - lockup.wordmark.baselines[0]).toBeCloseTo(1.05 * 22.4);
    // Two 1.05 em lines (47.04) centred on the emblem.
    expect(lockup.offset.y).toBeCloseTo((56 - 2 * 1.05 * 22.4) / 2);
  });

  it.each([32, 110, 240])('scales every distance with the emblem (%d)', (emblemSize) => {
    const k = emblemSize / 56;
    const at56 = layoutBubbleLockup(fonts.wordmark, { emblemSize: 56, theme: 'light' });
    const lockup = layoutBubbleLockup(fonts.wordmark, { emblemSize, theme: 'light' });
    expect(lockup.wordmark.fontSize).toBeCloseTo(0.4 * emblemSize);
    expect(lockup.offset.x - emblemSize).toBeCloseTo(10 * k);
    expect(lockup.offset.y).toBeCloseTo(at56.offset.y * k);
    expect(lockup.box.maxX).toBeCloseTo(at56.box.maxX * k);
    expect(lockup.box.maxY).toBe(emblemSize);
  });

  it('lays out the same in both themes', () => {
    const light = layoutBubbleLockup(fonts.wordmark, { emblemSize: 56, theme: 'light' });
    const dark = layoutBubbleLockup(fonts.wordmark, { emblemSize: 56, theme: 'dark' });
    expect(dark.box).toEqual(light.box);
    expect(dark.wordmark.shapes.map((s) => s.d)).toEqual(light.wordmark.shapes.map((s) => s.d));
  });
});

describe('the drawings', () => {
  const emblem = { side: 240, content: <circle cx={120} cy={120} r={112} fill="#9cc8ff" /> };

  const files = () => [
    standaloneSvg('bubble/wordmark-light', (idPrefix) => (
      <BubbleWordmarkSvg
        wordmark={buildBubbleWordmark(fonts.wordmark, { fontSize: 40, theme: 'light' })}
        idPrefix={idPrefix}
      />
    )),
    standaloneSvg('bubble/lockup-dark', (idPrefix) => (
      <BubbleLockupSvg
        lockup={layoutBubbleLockup(fonts.wordmark, { emblemSize: 56, theme: 'dark' })}
        emblem={emblem}
        idPrefix={idPrefix}
      />
    )),
  ];

  it('need no fonts: letters are paths, with no text or font references', () => {
    for (const svg of files()) {
      expect(svg).not.toMatch(/<text|<tspan|font-family|font-face|@import|<style|<foreignObject/i);
      expect(svg.match(/<path /g)).toHaveLength(16);
    }
  });

  it('frame the emblem and wordmark whole, the emblem scaled to its size', () => {
    const svg = files()[1] ?? '';
    expect(svg).toMatch(/viewBox="0 0 179\.89 56"/);
    expect(svg).toContain('scale(0.233333)');
    const shadowed = standaloneSvg('bubble/lockup-shadow', (idPrefix) => (
      <BubbleLockupSvg
        lockup={layoutBubbleLockup(fonts.wordmark, { emblemSize: 240, theme: 'dark' })}
        emblem={{ ...emblem, paintedBounds: { minX: 0, minY: 0, maxX: 240, maxY: 246 } }}
        idPrefix={idPrefix}
      />
    ));
    expect(shadowed).toMatch(/viewBox="0 0 [\d.]+ 246"/);
  });
});
