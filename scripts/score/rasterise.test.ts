import { beforeAll, describe, expect, it } from 'vitest';
import { buildLogo, type LogoConfig } from '../../src/concepts/flat/engine';
import type { LogoFonts } from '../../src/shared';
import { loadLogoFontsFromDisk } from '../node-fonts';
import { irregular } from './fixtures';
import { candidateSvg, placement, renderWithResvg } from './rasterise';
import type { Registration } from './reference';

let fonts: LogoFonts;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
});

const registration: Registration = {
  note: 'a test canvas',
  canvas: { width: 400, height: 300 },
  sourceCrop: { x: 0, y: 0, width: 400, height: 300 },
  cropAt: { x: 0, y: 0 },
  background: [254, 247, 234],
  backgroundSpread: 0,
  tile: { x: 140, y: 100, width: 130, height: 80 },
  centre: { x: 205, y: 140 },
  side: 102,
  residual: { x: 14, y: -11 },
};

/** A bare tile of the given size: no sheets, no halo, a flat colour, no facets. */
function bareTile(size: number): LogoConfig {
  return {
    ...irregular,
    emblem: { ...irregular.emblem, layerCount: 0 },
    tile: {
      ...irregular.tile,
      size,
      cornerRadius: 0,
      colour: '#ff0000',
      facets: { apexX: 0.5, apexY: 0.5, top: 0, right: 0, bottom: 0, left: 0 },
      textColour: '#ff0000',
      halo: { strength: 0, reach: 14, offset: 5 },
    },
  };
}

describe('placement', () => {
  // Independently: the registered square is centred on (205, 140) with side 102,
  // so its corners are (154, 89) and (256, 191) whatever the tile's own size.
  for (const size of [100, 60]) {
    it(`puts a tile of size ${size} on the registered square`, () => {
      const { tile } = buildLogo(bareTile(size), fonts).emblem;
      const place = placement(tile, registration);
      expect(place.scale).toBeCloseTo(102 / size, 12);
      const topLeft = place.toCanvas({ x: tile.x, y: tile.y });
      const bottomRight = place.toCanvas({ x: tile.x + tile.size, y: tile.y + tile.size });
      expect([topLeft.x, topLeft.y, bottomRight.x, bottomRight.y].map((v) => Number(v.toFixed(9)))).toEqual([
        154, 89, 256, 191,
      ]);
    });
  }

  it('draws the tile there at 1:1, background colour everywhere else', () => {
    const { svg, clipped } = candidateSvg(buildLogo(bareTile(60), fonts), registration);
    expect(clipped).toBe(false);
    const image = renderWithResvg(svg, registration.canvas);
    const at = (x: number, y: number) => Array.from(image.data.subarray((y * 400 + x) * 3, (y * 400 + x) * 3 + 3));
    expect(at(154, 89)).toEqual([255, 0, 0]);
    expect(at(255, 190)).toEqual([255, 0, 0]);
    expect(at(153, 89)).toEqual([254, 247, 234]);
    expect(at(256, 190)).toEqual([254, 247, 234]);
    expect(at(154, 88)).toEqual([254, 247, 234]);
    expect(at(0, 0)).toEqual([254, 247, 234]);
  });

  it('shifts the whole drawing by an injected offset after the transform', () => {
    const { svg } = candidateSvg(buildLogo(bareTile(100), fonts), registration, { x: 6, y: -6 });
    const image = renderWithResvg(svg, registration.canvas);
    const at = (x: number, y: number) => Array.from(image.data.subarray((y * 400 + x) * 3, (y * 400 + x) * 3 + 3));
    expect(at(160, 83)).toEqual([255, 0, 0]);
    expect(at(159, 83)).toEqual([254, 247, 234]);
  });

  it('reports art falling outside the canvas as clipped', () => {
    // At this scale the Irregular sheets just fit (about 139 px above and below the centre's 140).
    const logo = buildLogo(irregular, fonts);
    expect(candidateSvg(logo, registration).clipped).toBe(false);
    expect(candidateSvg(logo, registration, { x: 0, y: -20 }).clipped).toBe(true);
    expect(candidateSvg(logo, registration, { x: 80, y: 0 }).clipped).toBe(true);
  });
});
