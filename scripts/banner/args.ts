import { parseArgs } from 'node:util';
import { bannerAlignments, bannerBands, bannerFramings, type BannerOptions } from '../../src/bubble/banner';
import { themes } from '../../src/bubble/engine';

export const usage = `Usage: pnpm banner --out <dir> [options]

Writes the London TypeScript banner: the lockup, with optional text beside it.

  --text <text>        set beside the lockup, right-aligned (default: none, the lockup alone)
  --theme <theme>      light, dark or both (default: both)
  --band <side>        off, left or bottom (default: off)
  --align <where>      left, centre or right: where the lockup sits when there is no text (default: left)
  --framing <framing>  strip (1200 x 208, transparent) or meetup (1200 x 675, opaque) (default: strip)
  --format <format>    svg, png or both (default: svg)
  --out <dir>          the folder to write into, made if missing
  --help               show this

File names are the text's slug, the options and a hash of the drawing, so a
changed banner gets a new name (GitHub and Safari cache images by address).`;

const formats = ['svg', 'png', 'both'] as const;

export interface BannerCommand {
  banners: BannerOptions[];
  formats: ('svg' | 'png')[];
  outDir: string;
}

function oneOf<T extends string>(name: string, value: string | undefined, choices: readonly T[], fallback: T): T {
  if (value === undefined) return fallback;
  if ((choices as readonly string[]).includes(value)) return value as T;
  throw new Error(`--${name} must be one of ${choices.join(', ')}, not ${JSON.stringify(value)}`);
}

/** The command's arguments as the banners to write, or `undefined` when only help was asked for. */
export function parseBannerArgs(argv: string[]): BannerCommand | undefined {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    allowPositionals: false,
    options: {
      text: { type: 'string', default: '' },
      theme: { type: 'string' },
      band: { type: 'string' },
      align: { type: 'string' },
      framing: { type: 'string' },
      format: { type: 'string' },
      out: { type: 'string' },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) return undefined;
  if (!values.out) throw new Error('--out is required: the folder to write the banner into');
  const text = values.text;
  // With text the lockup is always on the left, so an alignment would be silently ignored.
  if (text.trim() !== '' && values.align !== undefined)
    throw new Error('--align applies only to a banner with no text');
  const theme = oneOf('theme', values.theme, [...themes, 'both'], 'both');
  const shared = {
    text,
    band: oneOf('band', values.band, bannerBands, 'off'),
    align: oneOf('align', values.align, bannerAlignments, 'left'),
    framing: oneOf('framing', values.framing, bannerFramings, 'strip'),
  };
  const format = oneOf('format', values.format, formats, 'svg');
  return {
    banners: (theme === 'both' ? themes : [theme]).map((t) => ({ ...shared, theme: t })),
    formats: format === 'both' ? ['svg', 'png'] : [format],
    outDir: values.out,
  };
}
