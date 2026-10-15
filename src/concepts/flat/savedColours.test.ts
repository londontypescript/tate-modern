import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { isHexColour, palette, type LogoFonts } from '../../shared';
import { parsePresets } from '../../studio/presets';
import { fillMissing } from './FlatStudio';
import { flatStarters } from './starters';
import { getAt, missing, pathName, withLeaf, type LeafPath } from './testing/numericLeaves';
import { classOf, classedFields, colourLeaves, fieldName, notColours, stringPaths } from './testing/stringLeaves';
import { defaultLogoConfig, type LogoConfig } from './engine/config';
import { buildLogo, generateLayers } from './engine/geometry';
import { sanitizeLogoConfig } from './engine/sanitize';

let fonts: LogoFonts;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
});

const fixtures = JSON.parse(
  readFileSync(new URL('./components/__fixtures__/configs.json', import.meta.url), 'utf8'),
) as Record<string, unknown>;
/** The fixtures as the studio loads them. */
const load = (configs: unknown[]) =>
  parsePresets(
    JSON.stringify(configs.map((config, i) => ({ id: `${i}`, name: `${i}`, config }))),
    defaultLogoConfig,
    fillMissing,
  ).map((p) => p.config);
const existing: LogoConfig[] = [
  defaultLogoConfig,
  ...flatStarters.map((s) => s.config),
  ...load(Object.values(fixtures)),
];

/**
 * The defaults with every colour changed to one of its own, so a field that
 * falls back to its default is told apart from one left as it was.
 */
const own = (i: number) => `#a0b0${i.toString(16).padStart(2, '0')}`;
const distinct = colourLeaves.reduce<LogoConfig>(
  (config, path, i) => withLeaf(path, own(i), config),
  defaultLogoConfig,
);
/** A two-entry list whose first entry is a hole, as no JSON gives but a configuration from code may. */
const sparse = (second: unknown) => {
  const list: unknown[] = [];
  list[1] = second;
  return list;
};
const label = (value: unknown) => (value === missing ? 'missing' : JSON.stringify(value));
const runsAt = (config: LogoConfig, line: 0 | 1) => config.wordmark.lines[line].runs;
const withRuns = (runs: unknown, line: 0 | 1 = 1, base = distinct) =>
  withLeaf(['wordmark', 'lines', line, 'runs'], runs, base);

describe('the inventory of string fields', () => {
  it('classes every string in the defaults, the starters and the saved fixtures', () => {
    for (const config of [...existing, ...Object.values(fixtures)]) {
      for (const path of stringPaths(config)) expect(classOf(path), pathName(path)).toBeDefined();
    }
  });

  it('leaves a string named like an Object method unclassed', () => {
    for (const name of ['toString', 'constructor', 'hasOwnProperty']) expect(classOf([name]), name).toBeUndefined();
  });

  it('classes only fields the defaults have', () => {
    const found = new Set(stringPaths(defaultLogoConfig).map(fieldName));
    for (const field of classedFields) expect(found.has(field), field).toBe(true);
  });

  it('finds every colour the flat renderer writes', () => {
    expect([...new Set(colourLeaves.map(fieldName))].sort()).toEqual([
      'emblem.colours.*',
      'emblem.fadeColour',
      'layout.background',
      'tile.colour',
      'tile.textColour',
      'wordmark.lines.*.runs.*.colour',
    ]);
  });

  it('finds only colours of the accepted form in the defaults, the starters and the saved fixtures', () => {
    for (const config of existing) {
      for (const path of stringPaths(config).filter((p) => classOf(p) === 'colour')) {
        expect(isHexColour(getAt(config, path)), pathName(path)).toBe(true);
      }
    }
  });
});

describe('sanitizeLogoConfig with untrusted colours', () => {
  /** What a bad colour at `path` becomes: the same field of the defaults, the whole list for the sheets. */
  const fallback = (path: LeafPath) =>
    path[1] === 'colours' ? defaultLogoConfig.emblem.colours : getAt(defaultLogoConfig, path);
  const fieldOf = (path: LeafPath) => (path[1] === 'colours' ? path.slice(0, 2) : path);

  it('gives a colour field that is not # and six hex digits its default, and leaves every other colour', () => {
    for (const path of colourLeaves) {
      for (const [name, value] of notColours) {
        const label = `${pathName(path)} = ${name}`;
        const used = sanitizeLogoConfig(withLeaf(path, value, distinct));
        expect(getAt(used, fieldOf(path)), label).toEqual(fallback(path));
        for (const other of colourLeaves.filter((p) => fieldOf(p).join() !== fieldOf(path).join())) {
          expect(getAt(used, other), `${label}: ${pathName(other)}`).toBe(getAt(distinct, other));
        }
      }
    }
  });

  it('keeps a colour exactly as written, in either case', () => {
    for (const path of colourLeaves) {
      for (const value of ['#ABCDEF', '#abcdef', '#AbCd09']) {
        expect(getAt(sanitizeLogoConfig(withLeaf(path, value)), path), pathName(path)).toBe(value);
      }
    }
  });

  it('gives the sheets the default list unless it is a non-empty list of colours only', () => {
    for (const colours of [[], ['#112233', 'red'], [5], sparse('#445566'), 'red', null, {}]) {
      const used = sanitizeLogoConfig(withLeaf(['emblem', 'colours'], colours, distinct));
      expect(used.emblem.colours, JSON.stringify(colours)).toEqual(defaultLogoConfig.emblem.colours);
    }
  });

  it('draws a list of any length the engine is given, while the studio loads only one of the defaults’ length', () => {
    for (const colours of [['#112233'], ['#112233', '#445566', '#778899']]) {
      const config = withLeaf(['emblem', 'colours'], colours);
      expect(sanitizeLogoConfig(config).emblem.colours).toEqual(colours);
      expect(generateLayers({ ...config.emblem, layerCount: 3 }).map((l) => l.fill)).toEqual(
        [0, 1, 2].map((i) => colours[i % colours.length]),
      );
      const [loaded] = load([{ emblem: { colours } }]);
      expect(loaded?.emblem.colours).toEqual(defaultLogoConfig.emblem.colours);
    }
  });

  it('leaves the stored configuration as it is', () => {
    const stored = withLeaf(['layout', 'background'], 'url(#x)', withRuns([{ text: 'A', colour: 'red' }]));
    const copy = structuredClone(stored);
    sanitizeLogoConfig(stored);
    expect(stored).toEqual(copy);
  });
});

describe('sanitizeLogoConfig with untrusted wordmark runs', () => {
  it('gives a line the default line’s runs unless they are a non-empty list of objects with text', () => {
    const run = { text: 'B', colour: '#112233' };
    for (const runs of [
      [],
      null,
      'Type',
      [null],
      [{ colour: '#112233' }],
      [{ text: 5, colour: '#112233' }],
      sparse(run),
    ]) {
      for (const line of [0, 1] as const) {
        const used = sanitizeLogoConfig(withRuns(runs, line));
        expect(runsAt(used, line), `line ${line}: ${JSON.stringify(runs)}`).toEqual(runsAt(defaultLogoConfig, line));
        expect(runsAt(used, line ? 0 : 1)).toEqual(runsAt(distinct, line ? 0 : 1));
      }
    }
  });

  it('keeps valid runs, extra runs included, as they are', () => {
    const runs = [
      { text: 'Ty', colour: '#112233' },
      { text: 'pe', colour: '#445566' },
      { text: 'Script', colour: '#778899' },
    ];
    expect(runsAt(sanitizeLogoConfig(withRuns(runs)), 1)).toEqual(runs);
  });

  it('gives a run’s bad colour the default run’s at its place, or the ink past the default runs', () => {
    for (const [name, colour] of notColours) {
      const runs = [
        { text: 'Ty', colour },
        { text: 'pe', colour: '#445566' },
        { text: 'Script', colour },
        { text: '!', colour },
      ];
      const used = runsAt(sanitizeLogoConfig(withRuns(runs)), 1);
      const [type, script] = runsAt(defaultLogoConfig, 1);
      expect(
        used.map((r) => r.colour),
        name,
      ).toEqual([type?.colour, '#445566', palette.ink, palette.ink]);
      expect(used.map((r) => r.text)).toEqual(['Ty', 'pe', 'Script', '!']);
      expect(script?.colour).not.toBe(palette.ink);
    }
  });
});

describe('the other saved strings', () => {
  it('keeps the blend modes the studio offers', () => {
    for (const mode of ['normal', 'multiply']) {
      expect(sanitizeLogoConfig(withLeaf(['emblem', 'blendMode'], mode)).emblem.blendMode).toBe(mode);
    }
  });

  it('gives any other blend mode the default', () => {
    for (const mode of ['screen', 'MULTIPLY', ' multiply', 'multiply; fill: red', '', 5, null, {}, missing]) {
      const used = sanitizeLogoConfig(withLeaf(['emblem', 'blendMode'], mode));
      expect(used.emblem.blendMode, label(mode)).toBe(defaultLogoConfig.emblem.blendMode);
    }
  });

  it('gives tile text that is not a string the default', () => {
    for (const text of [5, null, ['TS'], {}, missing]) {
      expect(sanitizeLogoConfig(withLeaf(['tile', 'text'], text)).tile.text, label(text)).toBe(
        defaultLogoConfig.tile.text,
      );
    }
    expect(sanitizeLogoConfig(withLeaf(['tile', 'text'], 'A "b"')).tile.text).toBe('A "b"');
  });

  it('draws the same sheets through generateLayers as through buildLogo, whatever the colours and blend mode', () => {
    const emblems: [string, unknown][] = [
      ...notColours.map(([name, v]): [string, unknown] => [`colours: [${name}]`, ['#112233', v]]),
      ...notColours.map(([name, v]): [string, unknown] => [`fadeColour: ${name}`, v]),
      ['blendMode: screen', 'screen'],
    ];
    for (const [name, value] of emblems) {
      const field = name.split(':')[0] as string;
      const config = withLeaf(['emblem', field], value, withLeaf(['emblem', 'fade'], 0.5));
      const alone = generateLayers(config.emblem);
      const built = buildLogo(config, fonts).emblem.layers;
      expect(alone, name).toEqual(built);
      for (const layer of alone) {
        expect([layer.fill, layer.fade?.colour, layer.blendMode], name).toEqual([
          expect.stringMatching(/^#[0-9a-f]{6}$/i),
          expect.stringMatching(/^#[0-9a-f]{6}$/i),
          expect.stringMatching(/^(normal|multiply)$/),
        ]);
      }
    }
  });
});
