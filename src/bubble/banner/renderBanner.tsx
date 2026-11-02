import { standaloneSvg } from '../../shared/react/standaloneSvg';
import { sha256Hex } from '../../shared/sha256';
import { BannerSvg } from './BannerSvg';
import type { BannerLayout, BannerOptions } from './framing';
import { bannerText } from './layout';

/**
 * A banner as a standalone SVG file, written at its pixel size, with ids
 * taken from its content (see `standaloneSvg`). The command writes it, and
 * a PNG is this file rasterised.
 */
export function renderBannerSvg(layout: BannerLayout, lettering: string) {
  const { framing, theme } = layout.options;
  return standaloneSvg(`bubble/banner-${framing}-${theme}`, (prefix) => (
    <BannerSvg layout={layout} lettering={lettering} width={layout.canvas.width} idPrefix={prefix} />
  ));
}

/** The longest the text's part of a file name gets, so a long name still gives a manageable file name. */
const slugLength = 40;

/**
 * The text as it may appear in a file name: lower-case ASCII letters and
 * digits joined by single hyphens, accents dropped. Never the text itself,
 * so no slash, dot or other character can choose where a file goes.
 */
export function bannerSlug(text: string) {
  const slug = bannerText(text)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, slugLength)
    .replace(/-+$/, '');
  return slug === '' ? 'london-typescript' : slug;
}

/**
 * A banner's file name: what it shows, then the first eight hex digits of
 * the SVG's SHA-256. GitHub's image proxy and Safari cache an image by its
 * address, so a banner whose drawing changes must change its name; the hash
 * does that by itself, and the same drawing keeps the same name. The PNG
 * takes its SVG's name, as it is that file rasterised.
 */
export function bannerFileName(options: BannerOptions, svg: string, format: 'svg' | 'png') {
  const { framing, theme, band, align, text } = options;
  const parts = [
    bannerSlug(text),
    framing === 'meetup' ? 'meetup' : undefined,
    theme,
    band === 'off' ? undefined : `band-${band}`,
    bannerText(text) === '' ? align : undefined,
    sha256Hex(svg).slice(0, 8),
  ];
  return `${parts.filter((part) => part !== undefined).join('-')}.${format}`;
}
