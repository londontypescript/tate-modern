import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import type { Box, LogoFonts } from '../../../shared';
import { buildLogo, type LogoConfig } from '../engine';
import { malformedContainers, numericLeaves, pathName, untrusted, withLeaf } from '../testing/numericLeaves';
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
        expectWellFormed(`${pathName(path)} = ${name}`, withLeaf(path, value));
      }
    }
  });

  it('builds and writes well-formed SVG when a part of the configuration is malformed', () => {
    for (const [name, config] of malformedContainers) expectWellFormed(name, config);
  });
});

function expectWellFormed(label: string, config: LogoConfig) {
  const logo = buildLogo(config, fonts);
  expect(finiteBox(logo.bounds) && finiteBox(logo.rotationSafeBounds), label).toBe(true);
  for (const variant of svgVariants) {
    const svg = renderLogoSvg(variant, logo);
    expect(svg, `${label}, ${variant}`).not.toMatch(/NaN|Infinity|undefined/);
    const box = viewBox(svg);
    expect(finiteBox(box) && box.maxX > box.minX && box.maxY > box.minY, `${label}, ${variant}`).toBe(true);
  }
}
