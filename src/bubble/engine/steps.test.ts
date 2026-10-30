import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { buildBubble, details, themes, tileLettering, type BubbleDrawing, type Group, type Node } from '.';

let lettering: string;
beforeAll(async () => {
  lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
});

const allNodes = (nodes: readonly Node[]): Node[] =>
  nodes.flatMap((n) => (n.kind === 'group' ? [n, ...allNodes(n.children)] : [n]));

const core = (drawing: BubbleDrawing): Group => {
  const found = drawing.layers.find((l) => l.name === 'core');
  if (!found) throw new Error('No core layer');
  return found;
};

const panes = (drawing: BubbleDrawing) =>
  core(drawing).children.filter((n) => n.kind === 'rect' && n.width === 120 && n.fill !== undefined);
const tile = (drawing: BubbleDrawing) => core(drawing).children.find((n) => n.kind === 'rect' && n.width === 116);
const ts = (drawing: BubbleDrawing) => core(drawing).children.find((n) => n.kind === 'path' && n.d === lettering);
const gloss = (drawing: BubbleDrawing) =>
  core(drawing).children.find((n) => n.kind === 'path' && n.d === 'M70,70 h60 l-60,30 Z');

describe('the smaller steps', () => {
  it.each(themes)('%s: every step keeps the five-pane fan at the reference’s turns', (theme) => {
    for (const detail of details) {
      const drawn = panes(buildBubble({ theme, detail, lettering }));
      expect(
        drawn.map((p) => p.transform),
        detail,
      ).toEqual([-60, -46, -32, -18, -6].map((rotate) => ({ rotate, cx: 120, cy: 120 })));
    }
  });

  it.each(themes)('%s: blurs only the full bubble; the smaller steps have no blur and no ground shadow', (theme) => {
    for (const detail of ['small', 'tiny', 'none'] as const) {
      const drawing = buildBubble({ theme, detail, lettering });
      expect(drawing.defs.blurs, detail).toEqual([]);
      expect(
        allNodes(drawing.layers).filter((n) => n.filter !== undefined || n.kind === 'ellipse'),
        detail,
      ).toEqual([]);
    }
    expect(buildBubble({ theme, detail: 'full', lettering }).defs.blurs.length).toBeGreaterThan(0);
  });

  it.each(themes)('%s: small keeps a glass body, a rim and one highlight, nothing else of the glass', (theme) => {
    const drawing = buildBubble({ theme, detail: 'small', lettering });
    expect(drawing.layers.map((l) => l.name)).toEqual(['ground', 'core', 'rim', 'shine']);
    const [rim] = drawing.layers.find((l) => l.name === 'rim')?.children ?? [];
    // The rim's outer edge is the sphere's: r 109 plus half its width of 6.
    expect(rim).toMatchObject({ kind: 'circle', r: 109, strokeWidth: 6, fill: 'none' });
  });

  it.each(themes)('%s: tiny and none drop the bubble, leaving the fan and the tile', (theme) => {
    for (const detail of ['tiny', 'none'] as const) {
      const drawing = buildBubble({ theme, detail, lettering });
      expect(
        drawing.layers.map((l) => l.name),
        detail,
      ).toEqual(['core']);
      expect(drawing.defs.clips, detail).toEqual([]);
      expect(gloss(drawing), detail).toBeUndefined();
    }
  });

  it('grows the emblem and its TS as the bubble shrinks, the TS scaled about the tile’s bottom-right corner', () => {
    const at = (detail: (typeof details)[number]) => buildBubble({ theme: 'light', detail, lettering });
    expect(core(at('small')).transform).toEqual({ scale: 1, cx: 120, cy: 120 });
    expect(core(at('tiny')).transform).toEqual({ scale: 1.3, cx: 120, cy: 120 });
    expect(core(at('none')).transform).toEqual({ scale: 1.3, cx: 120, cy: 120 });
    expect(ts(at('full'))?.transform).toBeUndefined();
    expect(ts(at('small'))?.transform).toEqual({ scale: 1.3, cx: 178, cy: 178 });
    expect(ts(at('tiny'))?.transform).toEqual({ scale: 1.45, cx: 178, cy: 178 });
    expect(gloss(at('small'))).toBeDefined();
  });

  it('draws no TS at the smallest step, and its tile at three quarters, so the fan shows round it', () => {
    const drawing = buildBubble({ theme: 'dark', detail: 'none', lettering });
    expect(ts(drawing)).toBeUndefined();
    expect(tile(drawing)?.transform).toEqual({ scale: 0.75, cx: 120, cy: 120 });
  });

  it('draws the bare steps the same in both themes, since they carry no glass', () => {
    for (const detail of ['tiny', 'none'] as const) {
      const light = buildBubble({ theme: 'light', detail, lettering });
      const dark = buildBubble({ theme: 'dark', detail, lettering });
      expect(dark.defs, detail).toEqual(light.defs);
      expect(dark.layers, detail).toEqual(light.layers);
    }
  });

  it.each(themes)('%s: every step defines what it uses and paints only concrete colours', (theme) => {
    for (const detail of details) {
      const drawing = buildBubble({ theme, detail, lettering });
      const nodes = allNodes(drawing.layers);
      const gradientOf = (p: unknown) =>
        typeof p === 'object' && p !== null ? (p as { gradient: string }).gradient : [];
      const used = new Set(nodes.flatMap((n) => [gradientOf(n.fill), gradientOf(n.stroke)].flat()));
      expect(new Set(drawing.defs.gradients.map((g) => g.id)), detail).toEqual(used);
      expect(new Set(drawing.defs.clips.map((c) => c.id)), detail).toEqual(
        new Set(nodes.flatMap((n) => (n.kind === 'group' ? (n.clip ?? []) : []))),
      );
      for (const p of nodes.flatMap((n) => [n.fill, n.stroke])) {
        if (p === undefined || typeof p === 'object') continue;
        expect(p).toMatch(/^(#[0-9a-f]{6}|none)$/);
      }
    }
  });
});
