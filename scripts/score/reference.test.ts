import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { decodePng, type RgbImage } from './image';
import { loadReference, referenceDir, regionCodes, type Reference, type Registration } from './reference';
import { buildRegions, measureTile } from './referenceMake';

let reference: Reference;
let mark: RgbImage;
let regions: RgbImage;
let registration: Registration;

beforeAll(async () => {
  reference = await loadReference();
  registration = JSON.parse(await readFile(join(referenceDir, 'registration.json'), 'utf8')) as Registration;
  mark = decodePng(await readFile(join(referenceDir, 'mark.png')));
  regions = decodePng(await readFile(join(referenceDir, 'regions.png')));
});

describe('the committed reference', () => {
  it('has mark and regions of the canvas size', () => {
    expect([mark.width, mark.height]).toEqual([registration.canvas.width, registration.canvas.height]);
    expect([regions.width, regions.height]).toEqual([mark.width, mark.height]);
  });

  it('has only the three region colours, each region non-empty', () => {
    expect(reference.counts.background).toBeGreaterThan(0);
    expect(reference.counts.sheets).toBeGreaterThan(0);
    expect(reference.counts.tile).toBeGreaterThan(0);
    expect(reference.counts.background + reference.counts.sheets + reference.counts.tile).toBe(
      mark.width * mark.height,
    );
  });

  it('refuses a regions image with any other colour', () => {
    const odd = { ...regions, data: Uint8Array.from(regions.data) };
    odd.data[1] = 1;
    expect(() => regionCodes(odd)).toThrow(/regions.png: pixel \(0, 0\) is 0,1,0/);
  });

  it('registers a square tile at the measured centre, its side the geometric mean', () => {
    const { tile, centre, side, residual } = registration;
    expect(tile.width).toBeGreaterThan(tile.height); // the original's tile is wider than tall
    expect(centre.x).toBeCloseTo(tile.x + tile.width / 2, 3);
    expect(centre.y).toBeCloseTo(tile.y + tile.height / 2, 3);
    expect(side).toBeCloseTo(Math.sqrt(tile.width * tile.height), 3);
    expect(residual.x).toBeCloseTo((tile.width - side) / 2, 3);
    expect(residual.y).toBeCloseTo((tile.height - side) / 2, 3);
  });

  it('still follows from mark.png: the tile measures the same and the regions redraw exactly', () => {
    expect(measureTile(mark)).toEqual(registration.tile);
    const redrawn = buildRegions(mark, registration);
    expect(
      Buffer.from(redrawn.data).equals(Buffer.from(regions.data)),
      'regions.png no longer follows from mark.png',
    ).toBe(true);
  });
});
