import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import { buildLogo, defaultLogoConfig, type LogoModel } from '../engine';
import { renderLogoSvg, svgVariants } from './renderSvg';

let logo: LogoModel;
beforeAll(async () => {
  logo = buildLogo(defaultLogoConfig, await loadLogoFontsFromDisk());
});

describe('renderLogoSvg', () => {
  it('produces identical output on every run', () => {
    for (const variant of svgVariants) {
      expect(renderLogoSvg(variant, logo)).toBe(renderLogoSvg(variant, logo));
    }
  });

  it('writes standalone, responsive, self-contained documents', () => {
    for (const variant of svgVariants) {
      const svg = renderLogoSvg(variant, logo);
      expect(svg).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="[-\d. ]+"/);
      expect(svg).not.toMatch(/<svg[^>]*\s(width|height)=/);
      expect(svg).not.toMatch(/<(text|image|foreignObject|script)\b/);
      expect(svg).not.toMatch(/NaN|Infinity|undefined/);
    }
  });

  it('keeps every square as its own rotated element', () => {
    const svg = renderLogoSvg('mark', logo);
    for (const layer of logo.emblem.layers) {
      expect(svg).toContain(`id="lts-${layer.id}"`);
      expect(svg).toContain(`transform="rotate(${layer.rotation})"`);
    }
  });

  it('adds a background only when asked', () => {
    expect(renderLogoSvg('logo', logo)).not.toContain('#fcf6e9');
    expect(renderLogoSvg('logo', logo, { background: '#fcf6e9' })).toContain('fill="#fcf6e9"');
  });
});
