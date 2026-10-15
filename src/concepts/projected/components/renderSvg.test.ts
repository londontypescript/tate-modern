import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import { defaultWordmarkConfig, tileLettering, type LogoFonts } from '../../../shared';
import { buildProjectedEmblem, defaultProjectedConfig } from '../engine';
import { buildProjectedLockup } from './ProjectedLogo';
import { renderProjectedSvg } from './renderSvg';

let fonts: LogoFonts;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
});

const lockup = (show = true) => {
  const config = { ...defaultProjectedConfig, lettering: { ...defaultProjectedConfig.lettering, show } };
  const lettering = tileLettering(fonts.sans).map((g, i) => ({ id: `l${i}`, d: g.d, fill: '' }));
  const emblem = buildProjectedEmblem(config, lettering);
  return buildProjectedLockup(emblem, defaultWordmarkConfig, fonts.serif, config.projection);
};

describe('renderProjectedSvg', () => {
  it('writes deterministic, standalone, self-contained documents', () => {
    for (const variant of ['mark', 'logo'] as const) {
      const svg = renderProjectedSvg(variant, lockup());
      expect(svg).toBe(renderProjectedSvg(variant, lockup()));
      expect(svg).toMatch(
        /^<\?xml version="1.0" encoding="UTF-8"\?>\n<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="[-\d. ]+"/,
      );
      expect(svg).not.toMatch(/<(text|image|foreignObject|script)\b/);
      expect(svg).not.toMatch(/NaN|Infinity|undefined/);
    }
  });

  it('gives every gradient a unique id that a polygon uses', () => {
    const svg = renderProjectedSvg('mark', lockup());
    const ids = [...svg.matchAll(/<linearGradient id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(svg).toContain(`fill="url(#${id})"`);
  });

  it('includes the lettering and the wordmark only where they belong', () => {
    const named = { idPrefix: 'lts' };
    expect(renderProjectedSvg('mark', lockup(true), named)).toContain('id="lts-lettering"');
    expect(renderProjectedSvg('mark', lockup(false), named)).not.toContain('id="lts-lettering"');
    expect(renderProjectedSvg('logo', lockup(), named)).toContain('id="lts-wordmark"');
    expect(renderProjectedSvg('mark', lockup(), named)).not.toContain('id="lts-wordmark"');
  });
});
