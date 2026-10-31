import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import { defaultWordmarkConfig, tileLettering, type LogoFonts } from '../../../shared';
import { buildProjectedEmblem, defaultProjectedConfig } from '../../projected/engine';
import { buildProjectedLockup } from '../../projected/components/ProjectedLogo';
import { renderProjectedSvg } from '../../projected/components/renderSvg';
import { buildLogo, defaultLogoConfig, type LogoConfig } from '../engine';
import { renderLogoSvg, svgVariants } from './renderSvg';

let fonts: LogoFonts;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
});

const withLook = (emblem: Partial<LogoConfig['emblem']>, halo?: LogoConfig['tile']['halo']): LogoConfig => ({
  ...defaultLogoConfig,
  emblem: { ...defaultLogoConfig.emblem, ...emblem },
  tile: { ...defaultLogoConfig.tile, halo: halo ?? defaultLogoConfig.tile.halo },
});

const projectedLockup = () => {
  const lettering = tileLettering(fonts.sans).map((g, i) => ({ id: `l${i}`, d: g.d, fill: '' }));
  const emblem = buildProjectedEmblem(defaultProjectedConfig, lettering);
  return buildProjectedLockup(emblem, defaultWordmarkConfig, fonts.serif, defaultProjectedConfig.projection);
};

/** Each `<svg>` of a page: its ids, in order, and every id it points at. */
const perSvg = (html: string) =>
  html
    .split('<svg')
    .slice(1)
    .map((svg) => ({
      ids: [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1] ?? ''),
      refs: [...svg.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map((m) => m[1] ?? m[2] ?? ''),
    }));

describe('ids in exported SVGs', () => {
  it('stay unique, and every reference resolves within its own SVG, when different exports share a page', () => {
    const fade = withLook({ fade: 0.6, fadeAngle: 30 });
    const halo = withLook({}, { strength: 0.8, reach: 20, offset: 8 });
    const both = withLook({ fade: 0.4, layerCount: 5 }, { strength: 0.5, reach: 12, offset: 4 });
    const exports = [defaultLogoConfig, fade, halo, both].flatMap((config) => {
      const logo = buildLogo(config, fonts);
      return svgVariants.flatMap((variant) => [
        renderLogoSvg(variant, logo),
        renderLogoSvg(variant, logo, { background: '#fcf6e9' }),
      ]);
    });
    for (const variant of ['mark', 'logo'] as const) exports.push(renderProjectedSvg(variant, projectedLockup()));

    // The four designs share one wordmark, and two copies of the same file
    // may share ids (out of scope: see the studio docs), so keep one of each.
    const distinct = [...new Set(exports)];
    expect(distinct).toHaveLength(4 * 2 * 2 + 2 + 2);
    const svgs = perSvg(distinct.join('\n'));
    expect(svgs).toHaveLength(distinct.length);
    expect(svgs.some((svg) => svg.refs.some((ref) => ref.includes('-halo-')))).toBe(true);
    expect(svgs.some((svg) => svg.refs.some((ref) => ref.includes('-fade-')))).toBe(true);
    const owner = new Map<string, number>();
    svgs.forEach((svg, i) => {
      for (const id of svg.ids) {
        expect(owner.get(id), `#${id} in svg ${i} is already in svg ${owner.get(id)}`).toBeUndefined();
        owner.set(id, i);
      }
    });
    svgs.forEach((svg, i) => {
      for (const ref of svg.refs) expect(owner.get(ref), `svg ${i} points at #${ref}`).toBe(i);
    });
  });

  it('all carry one prefix of 128 bits, taken from the content', () => {
    const logo = buildLogo(withLook({ fade: 0.5 }, { strength: 0.8, reach: 20, offset: 8 }), fonts);
    const exports = [
      ...svgVariants.map((variant) => renderLogoSvg(variant, logo)),
      ...(['mark', 'logo'] as const).map((variant) => renderProjectedSvg(variant, projectedLockup())),
    ];
    const prefixes = exports.map((svg) => {
      const [{ ids } = { ids: [] }] = perSvg(svg);
      const prefix = /^lts-[0-9a-f]{32}-/.exec(ids[0] ?? '')?.[0];
      expect(prefix).toBeDefined();
      for (const id of ids) expect(id.startsWith(prefix ?? '-'), id).toBe(true);
      return prefix;
    });
    // The mark, wordmark and logo of one design each get their own.
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it('are the same every time for the same configuration and variant', () => {
    const config = withLook({ fade: 0.5 }, { strength: 0.8, reach: 20, offset: 8 });
    for (const variant of svgVariants) {
      // Built twice from the configuration, as two separate downloads would be.
      const first = renderLogoSvg(variant, buildLogo(config, fonts));
      expect(renderLogoSvg(variant, buildLogo(structuredClone(config), fonts))).toBe(first);
    }
    expect(renderProjectedSvg('logo', projectedLockup())).toBe(renderProjectedSvg('logo', projectedLockup()));
  });
});
