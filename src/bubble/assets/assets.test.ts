import { readdirSync, readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadBubbleFontsFromDisk, loadLogoFontsFromDisk } from '../../../scripts/node-fonts';
import { slotRecipes, themes, tileLettering } from '../engine';
import { bubbleFileName, renderBubbleSvg } from '../react/renderSvg';
import { assetManifest } from './manifest';
import { pngSize, renderAssetSvg, type AssetInputs } from './renderAsset';

const assetsDir = new URL('../../../public/assets/', import.meta.url);
const read = (file: string) => readFileSync(new URL(file, assetsDir));

let inputs: AssetInputs;
beforeAll(async () => {
  inputs = {
    lettering: tileLettering((await loadLogoFontsFromDisk()).sans),
    font: (await loadBubbleFontsFromDisk()).wordmark,
  };
});

describe('public/assets', () => {
  it('holds exactly the files the manifest lists', () => {
    // CI regenerates the folder and fails on any difference in content; this says which set it must be.
    expect(readdirSync(assetsDir).sort()).toEqual(assetManifest.map((entry) => entry.file).sort());
  });

  it('gives every image slot at least one file, and a light and dark file for each pair', () => {
    for (const recipe of slotRecipes.filter((r) => r.detail !== 'bySize')) {
      const files = assetManifest.filter((e) => e.source.kind === 'slot' && e.source.recipe.id === recipe.id);
      expect(files.length, recipe.id).toBeGreaterThan(0);
      expect(new Set(files.map((e) => e.theme)), recipe.id).toEqual(new Set(recipe.themes));
    }
    for (const kind of ['emblem', 'wordmark'] as const) {
      expect(assetManifest.filter((e) => e.source.kind === kind).map((e) => e.theme)).toEqual(themes);
    }
  });

  it('match the studio’s download of the emblem byte for byte', () => {
    // `pnpm generate:assets` writes these; the studio's Download SVG must give the same file.
    for (const theme of themes) {
      expect(read(bubbleFileName(theme)).toString('utf8'), theme).toBe(renderBubbleSvg(theme, inputs.lettering));
    }
  });

  it.each(assetManifest.filter((e) => e.format === 'svg').map((e) => [e.file, e] as const))(
    '%s: is the renderer’s current output',
    (file, entry) => {
      expect(read(file).toString('utf8')).toBe(renderAssetSvg(entry, inputs));
    },
  );

  it.each(assetManifest.filter((e) => e.format === 'png').map((e) => [e.file, e] as const))(
    '%s: is a PNG at its recipe’s canvas size',
    (file, entry) => {
      const png = PNG.sync.read(read(file));
      expect({ width: png.width, height: png.height }).toEqual(pngSize(entry));
    },
  );
});
