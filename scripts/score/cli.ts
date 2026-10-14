/**
 * The score's command line:
 *
 *   pnpm score --make-reference <decoded original.png>
 *
 * remakes the committed reference (see reference/README.md).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { decodePng, encodePng } from './image';
import { referenceDir } from './reference';
import { makeReference } from './referenceMake';

async function writeReference(decoded: string) {
  const { mark, regions, registration } = makeReference(decodePng(await readFile(decoded), undefined, decoded));
  await writeFile(join(referenceDir, 'mark.png'), encodePng(mark));
  await writeFile(join(referenceDir, 'regions.png'), encodePng(regions));
  await writeFile(join(referenceDir, 'registration.json'), `${JSON.stringify(registration, null, 2)}\n`);
  console.log(`wrote ${referenceDir}`);
}

const args = process.argv.slice(2);
if (args[0] === '--make-reference' && args[1]) {
  await writeReference(args[1]);
} else {
  console.error('usage: pnpm score --make-reference <decoded original.png>');
  process.exitCode = 1;
}
