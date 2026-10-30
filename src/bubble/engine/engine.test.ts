import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { palette } from '../../shared/palette';
import { buildBubble, themes, tileLettering, type BubbleDrawing, type Group, type Node, type Theme } from '.';

let lettering: string;
beforeAll(async () => {
  lettering = tileLettering((await loadLogoFontsFromDisk()).sans);
});

const drawingFor = (theme: Theme) => buildBubble({ theme, detail: 'full', lettering });

const layer = (drawing: BubbleDrawing, name: string) => {
  const found = drawing.layers.find((l) => l.name === name);
  if (!found) throw new Error(`No ${name} layer`);
  return found;
};

/** Every node in the drawing, groups included, depth first. */
const allNodes = (nodes: readonly Node[]): Node[] =>
  nodes.flatMap((n) => (n.kind === 'group' ? [n, ...allNodes(n.children)] : [n]));

/**
 * A glyph outline's commands, without the straight segments that draw
 * nothing: one to where the pen already is, or back to the contour's start
 * just before it closes (a fill closes it anyway). The reference's
 * optimiser dropped those; the shared serialiser keeps them.
 */
function outline(d: string): { command: string; values: number[] }[] {
  const commands = [...d.matchAll(/([MLQCZ])([^MLQCZ]*)/g)].map((m) => ({
    command: m[1] ?? '',
    values: [...(m[2] ?? '').matchAll(/-?\d+(?:\.\d+)?/g)].map((n) => Number(n[0])),
  }));
  const same = (a: number[], b: number[]) => a[0] === b[0] && a[1] === b[1];
  let pen: number[] = [];
  let start: number[] = [];
  return commands.filter((c, i) => {
    const end = c.values.slice(-2);
    const next = commands[i + 1]?.command;
    const drawsNothing = c.command === 'L' && (same(end, pen) || (same(end, start) && (next ?? 'M') === 'M'));
    if (c.command === 'M') start = end;
    if (c.command !== 'Z') pen = end;
    return !drawsNothing && c.command !== 'Z';
  });
}

describe('the emblem', () => {
  it('fans five equal rounded panes at the reference’s turns, in the sunset colours from back to front', () => {
    const core = layer(drawingFor('light'), 'core');
    const panes = core.children.slice(0, 5);
    expect(panes.map((p) => p.transform)).toEqual(
      [-60, -46, -32, -18, -6].map((rotate) => ({ rotate, cx: 120, cy: 120 })),
    );
    for (const [i, pane] of panes.entries()) {
      expect(pane).toMatchObject({ kind: 'rect', x: 60, y: 60, width: 120, height: 120, rx: 14 });
      expect(pane.fill).toEqual({ gradient: `pane${i}` });
    }
    const colours = [
      palette.sunsetPlum,
      palette.sunsetMagenta,
      palette.sunsetPink,
      palette.sunsetOrange,
      palette.sunsetGold,
    ];
    const gradients = drawingFor('light').defs.gradients;
    colours.forEach((colour, i) => {
      expect(gradients.find((g) => g.id === `pane${i}`)?.stops).toEqual([
        { offset: 0, colour },
        { offset: 1, colour, opacity: 0.82 },
      ]);
    });
  });

  it('puts the gradient tile, gloss and white TS over the panes, the whole emblem at 0.9 of the sphere', () => {
    const core = layer(drawingFor('dark'), 'core');
    expect(core.transform).toEqual({ scale: 0.9, cx: 120, cy: 120 });
    expect(core.children[5]).toMatchObject({ kind: 'rect', x: 62, y: 62, width: 116, height: 116, rx: 14 });
    expect(
      drawingFor('dark')
        .defs.gradients.find((g) => g.id === 'tile')
        ?.stops.map((s) => s.colour),
    ).toEqual([palette.liftedBlue, palette.blue]);
    expect(core.children[6]).toMatchObject({ kind: 'path', d: 'M70,70 h60 l-60,30 Z', fillOpacity: 0.18 });
    expect(core.children[7]).toMatchObject({ kind: 'path', d: lettering, fill: palette.white });
  });

  it('sets TS where the reference does, from the Open Sans 800 outlines', () => {
    const reference = readFileSync('docs/references/bubble/emblem-light.svg', 'utf8');
    const ts = /<path d="([^"]+)" fill="#fff"\/><\/g>/.exec(reference)?.[1];
    if (!ts) throw new Error('The reference’s TS path was not found');
    const expected = outline(ts);
    const actual = outline(lettering);
    expect(actual.map((c) => c.command).join('')).toBe(expected.map((c) => c.command).join(''));
    actual.forEach((c, i) =>
      c.values.forEach((n, j) =>
        expect(Math.abs(n - (expected[i]?.values[j] ?? NaN)), `command ${i}, value ${j}`).toBeLessThan(0.006),
      ),
    );
  });
});

describe('the glass', () => {
  it('paints the reference’s layers in its order, the light theme’s extra glass only in light', () => {
    expect(drawingFor('light').layers.map((l) => l.name)).toEqual([
      'ground',
      'tint',
      'core',
      'body',
      'edge',
      'reflections',
      'rim',
      'shine',
      'windows',
      'glint',
      'outlines',
    ]);
    expect(drawingFor('dark').layers.map((l) => l.name)).toEqual([
      'ground',
      'tint',
      'core',
      'body',
      'reflections',
      'rim',
      'shine',
      'windows',
      'glint',
    ]);
  });

  it('casts a dark ground shadow under a pale body in light, a white shadow alone in dark', () => {
    const [lightShadow, lightBody] = layer(drawingFor('light'), 'ground').children;
    expect(lightShadow).toMatchObject({ kind: 'ellipse', fill: '#1b2a4a', fillOpacity: 0.22, filter: 'blur4' });
    expect(lightBody).toMatchObject({ kind: 'circle', r: 112, fill: { gradient: 'lightBody' } });
    expect(layer(drawingFor('dark'), 'ground').children).toEqual([
      { kind: 'ellipse', cx: 120, cy: 230, rx: 72, ry: 7, fill: palette.white, fillOpacity: 0.2, filter: 'blur4' },
    ]);
  });
});

describe('the drawing data', () => {
  it.each(themes)('%s: defines every gradient, blur and clip it uses, and nothing it doesn’t', (theme) => {
    const drawing = drawingFor(theme);
    const nodes = allNodes(drawing.layers);
    const gradientOf = (p: unknown) =>
      typeof p === 'object' && p !== null ? (p as { gradient: string }).gradient : [];
    const used = {
      gradients: new Set(nodes.flatMap((n) => [gradientOf(n.fill), gradientOf(n.stroke)].flat())),
      blurs: new Set(nodes.flatMap((n) => n.filter ?? [])),
      clips: new Set(nodes.flatMap((n) => (n.kind === 'group' ? (n.clip ?? []) : []))),
    };
    expect(new Set(drawing.defs.gradients.map((g) => g.id))).toEqual(used.gradients);
    expect(new Set(drawing.defs.blurs.map((b) => b.id))).toEqual(used.blurs);
    expect(new Set(drawing.defs.clips.map((c) => c.id))).toEqual(used.clips);
  });

  it.each(themes)('%s: paints only concrete colours', (theme) => {
    const drawing = drawingFor(theme);
    const paints = allNodes(drawing.layers).flatMap((n) => [n.fill, n.stroke]);
    const stops = drawing.defs.gradients.flatMap((g) => g.stops.map((s) => s.colour));
    for (const p of [...paints, ...stops]) {
      if (p === undefined || typeof p === 'object') continue;
      expect(p).toMatch(/^(#[0-9a-f]{6}|none)$/);
    }
  });

  it('names each layer once', () => {
    for (const theme of themes) {
      const names = drawingFor(theme).layers.map((l: Group) => l.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
