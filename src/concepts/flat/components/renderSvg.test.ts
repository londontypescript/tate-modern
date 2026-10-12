import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import type { LogoFonts } from '../../../shared';
import { buildLogo, defaultLogoConfig, type LogoModel } from '../engine';
import { renderLogoSvg, svgVariants } from './renderSvg';

let fonts: LogoFonts;
let logo: LogoModel;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
  logo = buildLogo(defaultLogoConfig, fonts);
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

  it('fills fading squares with their own gradient, and uniform ones with flat colour', () => {
    expect(renderLogoSvg('mark', logo)).not.toContain('<linearGradient');
    const faded = buildLogo({ ...defaultLogoConfig, emblem: { ...defaultLogoConfig.emblem, fade: 0.8 } }, fonts);
    const svg = renderLogoSvg('mark', faded);
    const ids = [...svg.matchAll(/<linearGradient id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(faded.emblem.layers.length);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(svg).toContain(`fill="url(#${id})"`);
  });
});
