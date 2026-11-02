import { dirname, join, resolve } from 'node:path';

/** What `bannerFileName` gives: a slug, then the extension. Anything else is refused before it touches the disk. */
const safeName = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:svg|png)$/;

/**
 * Where a banner file is written: `name` directly inside `outDir`. The name
 * is checked again here, though `bannerFileName` already builds it from a
 * slug, so no future change to the naming can write outside the folder.
 */
export function outputPath(outDir: string, name: string) {
  if (!safeName.test(name)) throw new Error(`Not a safe banner file name: ${JSON.stringify(name)}`);
  const folder = resolve(outDir);
  const path = join(folder, name);
  if (dirname(path) !== folder) throw new Error(`${name} would land outside ${folder}`);
  return path;
}
