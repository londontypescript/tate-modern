/**
 * What a score depended on, so two runs can be compared: the renderer and
 * decoder versions, Node and the platform, the reference files, the source
 * revision, the fonts and every metric parameter.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontFiles } from '../../src/shared';
import type { Reference } from './reference';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function packageVersion(name: string): Promise<string> {
  const manifest = JSON.parse(await readFile(require.resolve(`${name}/package.json`), 'utf8')) as { version: string };
  return manifest.version;
}

const sha256 = async (file: string) =>
  createHash('sha256')
    .update(await readFile(file))
    .digest('hex');

/** The commit checked out, marked when the worktree has uncommitted changes. */
function sourceRevision(): string {
  try {
    const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    const head = git('rev-parse', 'HEAD');
    return git('status', '--porcelain') === '' ? head : `${head}+uncommitted`;
  } catch {
    return 'unknown (no git)';
  }
}

/** The npm package a file path inside node_modules belongs to. */
const packageOf = (file: string) =>
  file
    .split('/')
    .slice(0, file.startsWith('@') ? 2 : 1)
    .join('/');

export async function provenance(reference: Reference, parameters: object) {
  const fonts = await Promise.all(
    Object.entries(fontFiles).map(async ([role, file]) => ({
      role,
      package: packageOf(file),
      version: await packageVersion(packageOf(file)),
      file,
      sha256: await sha256(require.resolve(file)),
    })),
  );
  return {
    renderer: { '@resvg/resvg-js': await packageVersion('@resvg/resvg-js') },
    decoder: { pngjs: await packageVersion('pngjs') },
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    source: sourceRevision(),
    reference: { files: reference.hashes, canvas: reference.registration.note },
    fonts,
    parameters,
  };
}
