/**
 * Checks a list of `{ label, config }` candidates before anything is drawn:
 * every field a flat `LogoConfig` needs, of the right kind, nothing extra,
 * nothing filled in, nothing the engine would change. The engine quietly
 * clamps or defaults a bad value, and a score of something other than what
 * was asked for is worse than an error.
 */
import { sanitizeLogoConfig, type LogoConfig } from '../../src/concepts/flat/engine';
import { differences } from './scope';

export interface Candidate {
  label: string;
  config: LogoConfig;
}

type Spec = 'number' | 'positive' | 'string' | 'colour' | 'boolean' | OneOf | List | { [field: string]: Spec };

// Tagged with a `$` key, which no configuration field starts with.
interface OneOf {
  $oneOf: readonly string[];
}
interface List {
  $list: Spec;
  length?: number;
  /** Refuse an empty list (the engine draws an empty palette in its fallback blue). */
  nonEmpty?: true;
}
const isOneOf = (spec: object): spec is OneOf => '$oneOf' in spec;
const isList = (spec: object): spec is List => '$list' in spec;

const run: Spec = { text: 'string', colour: 'colour' };
const line: Spec = { runs: { $list: run }, indent: 'number' };

const logoConfig: Spec = {
  emblem: {
    layerCount: 'number',
    rotationIncrement: 'number',
    initialRotation: 'number',
    squareSize: 'number',
    sizeTaper: 'number',
    cornerRadius: 'number',
    opacity: 'number',
    colours: { $list: 'colour', nonEmpty: true },
    blendMode: { $oneOf: ['normal', 'multiply'] },
    fade: 'number',
    fadeTurn: 'number',
    fadeAngle: 'number',
    fadeColour: 'colour',
    rotationJitter: 'number',
    sizeJitter: 'number',
    aspectJitter: 'number',
    offsetJitter: 'number',
    seed: 'number',
  },
  tile: {
    size: 'positive',
    cornerRadius: 'number',
    colour: 'colour',
    facets: {
      apexX: 'number',
      apexY: 'number',
      top: 'number',
      right: 'number',
      bottom: 'number',
      left: 'number',
    },
    text: 'string',
    textColour: 'colour',
    textScale: 'number',
    textOffsetX: 'number',
    textOffsetY: 'number',
    letterSpacing: 'number',
    halo: { strength: 'number', reach: 'number', offset: 'number' },
  },
  wordmark: {
    lines: { $list: line, length: 2 },
    lineSpacing: 'number',
    letterSpacing: 'number',
    condense: 'number',
    flourishScale: 'number',
  },
  layout: { horizontalGap: 'number', background: 'colour' },
  animation: { speed: 'number', baseVelocity: 'number', variation: 'number', alternateDirection: 'boolean' },
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Throws, naming the path, the first way `value` doesn't fit `spec`. */
function check(value: unknown, spec: Spec, path: string): void {
  if (value === undefined) throw new Error(`${path}: missing`);
  if (spec === 'number' || spec === 'positive') {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${path}: expected a finite number`);
    if (spec === 'positive' && value <= 0) throw new Error(`${path}: must be positive, got ${value}`);
  } else if (spec === 'string') {
    if (typeof value !== 'string') throw new Error(`${path}: expected a string`);
  } else if (spec === 'colour') {
    if (typeof value !== 'string' || !HEX.test(value))
      throw new Error(`${path}: expected a hex colour such as #1688f0`);
  } else if (spec === 'boolean') {
    if (typeof value !== 'boolean') throw new Error(`${path}: expected true or false`);
  } else if (isOneOf(spec)) {
    if (typeof value !== 'string' || !spec.$oneOf.includes(value)) {
      throw new Error(`${path}: expected one of ${spec.$oneOf.join(', ')}`);
    }
  } else if (isList(spec)) {
    if (!Array.isArray(value)) throw new Error(`${path}: expected a list`);
    if (spec.length !== undefined && value.length !== spec.length) {
      throw new Error(`${path}: expected ${spec.length} entries`);
    }
    if (spec.nonEmpty && value.length === 0) throw new Error(`${path}: expected at least one entry`);
    value.forEach((item, i) => check(item, spec.$list, `${path}[${i}]`));
  } else {
    if (!isRecord(value)) throw new Error(`${path}: expected an object`);
    const fields = spec as Record<string, Spec>;
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(fields, key)) throw new Error(`${path}.${key}: not a field of the configuration`);
    }
    for (const [key, field] of Object.entries(fields)) check(value[key], field, `${path}.${key}`);
  }
}

/** The candidates in `input`, checked, or an error naming the first problem. */
export function parseCandidates(input: unknown): Candidate[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error('expected a non-empty list of { "label": …, "config": … }');
  }
  const seen = new Set<string>();
  return input.map((item, i) => {
    const where = `candidate ${i + 1}`;
    if (!isRecord(item)) throw new Error(`${where}: expected { "label": …, "config": … }`);
    const { label, config } = item;
    if (typeof label !== 'string' || label.length === 0)
      throw new Error(`${where}: label: expected a non-empty string`);
    if (seen.has(label)) throw new Error(`${where}: duplicate label "${label}"`);
    seen.add(label);
    for (const key of Object.keys(item)) {
      if (key !== 'label' && key !== 'config') throw new Error(`${where} (${label}): ${key}: not a candidate field`);
    }
    try {
      check(config, logoConfig, 'config');
      const changed = differences(sanitizeLogoConfig(config as LogoConfig), config as LogoConfig);
      if (changed.length > 0) {
        throw new Error(`config.${changed[0]}: outside the range the engine draws (it would be changed)`);
      }
    } catch (error) {
      throw new Error(`${where} (${label}): ${(error as Error).message}`, { cause: error });
    }
    return { label, config: config as LogoConfig };
  });
}
