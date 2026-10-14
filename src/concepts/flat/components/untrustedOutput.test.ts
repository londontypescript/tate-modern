import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import type { Box, LogoFonts } from '../../../shared';
import { buildLogo } from '../engine';
import { numericLeaves, pathName, untrusted, withLeaf } from '../testing/numericLeaves';
import { renderLogoSvg, svgVariants } from './renderSvg';
import { viewBox } from './svgParse';

let fonts: LogoFonts;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
});

const finiteBox = (box: Box) => [box.minX, box.minY, box.maxX, box.maxY].every(Number.isFinite);

describe('the logo from a saved configuration with untrusted numbers', () => {
  it('builds finite bounds and writes well-formed SVG, whichever field is bad', () => {
    for (const [path] of numericLeaves) {
      for (const [name, value] of untrusted) {
        const label = `${pathName(path)} = ${name}`;
        const logo = buildLogo(withLeaf(path, value), fonts);
        expect(finiteBox(logo.bounds) && finiteBox(logo.rotationSafeBounds), label).toBe(true);
        for (const variant of svgVariants) {
          const svg = renderLogoSvg(variant, logo);
          expect(svg, `${label}, ${variant}`).not.toMatch(/NaN|Infinity|undefined/);
          const box = viewBox(svg);
          expect(finiteBox(box) && box.maxX > box.minX && box.maxY > box.minY, `${label}, ${variant}`).toBe(true);
        }
      }
    }
  });
});
