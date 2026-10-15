import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLogoFontsFromDisk } from '../../../../scripts/node-fonts';
import { defaultWordmarkConfig, tileLettering, type LogoFonts } from '../../../shared';
import { buildProjectedEmblem, defaultProjectedConfig, type ProjectedConfig } from '../engine';
import { projectedStarters } from '../starters';
import { ProjectedLogo, buildProjectedLockup } from './ProjectedLogo';
import { ProjectedMark } from './ProjectedMark';

let fonts: LogoFonts;
beforeAll(async () => {
  fonts = await loadLogoFontsFromDisk();
});

const emblemOf = (config: ProjectedConfig) => {
  const lettering = tileLettering(fonts.sans).map((g, i) => ({ id: `tile-letter-${i}-${g.char}`, d: g.d, fill: '' }));
  return buildProjectedEmblem(config, lettering);
};
const lockupOf = (config: ProjectedConfig) =>
  buildProjectedLockup(emblemOf(config), defaultWordmarkConfig, fonts.serif, config.projection);

/** A configuration that shades differently from the defaults, gradients on. */
const other = (): ProjectedConfig => {
  const starter = projectedStarters.find((s) => JSON.stringify(s.config) !== JSON.stringify(defaultProjectedConfig));
  if (!starter) throw new Error('No projected starter differs from the defaults');
  return { ...starter.config, projection: { ...starter.config.projection, gradients: true } };
};

/** Each `<svg>` of a page: its own ids, and the ids its `url(#…)` references point at. */
const perSvg = (html: string) =>
  html
    .split('<svg')
    .slice(1)
    .map((svg) => ({
      ids: [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1] ?? ''),
      refs: [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1] ?? ''),
    }));

/** Fails with the first id the page holds twice, and the first reference that leaves its own SVG. */
function expectOwnIds(html: string, count: number) {
  const svgs = perSvg(html);
  expect(svgs).toHaveLength(count);
  const all = svgs.flatMap((s) => s.ids);
  const twice = all.filter((id, i) => all.indexOf(id) !== i);
  expect(twice, 'ids that appear more than once on the page').toEqual([]);
  svgs.forEach((svg, i) => {
    expect(svg.refs.length, `svg ${i} has no gradients to check`).toBeGreaterThan(0);
    for (const ref of svg.refs) expect(svg.ids, `svg ${i} -> #${ref}`).toContain(ref);
  });
}

describe('live projected previews', () => {
  it('give each drawing its own gradient ids, so several share a page', () => {
    const a = defaultProjectedConfig;
    const b = other();
    expect(a.projection.gradients).toBe(true);
    // The two configurations really do shade differently, so a shared id would paint the wrong drawing.
    const alone = (config: ProjectedConfig) =>
      renderToStaticMarkup(<ProjectedMark emblem={emblemOf(config)} idPrefix="x" />);
    expect(alone(a)).not.toBe(alone(b));

    const html = renderToStaticMarkup(
      <>
        <ProjectedMark emblem={emblemOf(a)} />
        <ProjectedMark emblem={emblemOf(b)} />
        <ProjectedLogo lockup={lockupOf(a)} />
      </>,
    );
    expectOwnIds(html, 3);
  });

  it('give the studio’s two drawings of one emblem their own ids, with the live comparison on', () => {
    const emblem = emblemOf(defaultProjectedConfig);
    const square = { minX: -100, minY: -100, maxX: 100, maxY: 100 };
    // Without the wordmark: the main mark and the comparison panel's mark.
    expectOwnIds(
      renderToStaticMarkup(
        <>
          <ProjectedMark emblem={emblem} />
          <ProjectedMark emblem={emblem} bounds={square} />
        </>,
      ),
      2,
    );
    // With the wordmark: the main lockup and the comparison panel's mark.
    expectOwnIds(
      renderToStaticMarkup(
        <>
          <ProjectedLogo lockup={lockupOf(defaultProjectedConfig)} />
          <ProjectedMark emblem={emblem} bounds={square} />
        </>,
      ),
      2,
    );
  });

  it('use an explicit prefix as given, and give the shapes no ids without one', () => {
    const emblem = emblemOf(defaultProjectedConfig);
    const named = renderToStaticMarkup(<ProjectedMark emblem={emblem} idPrefix="given" />);
    expect([...named.matchAll(/ id="([^"]+)"/g)].every((m) => m[1]?.startsWith('given-'))).toBe(true);

    const own = renderToStaticMarkup(<ProjectedMark emblem={emblem} />);
    expect(own).not.toMatch(/<(polygon|g)\b[^>]* id=/);
    expect([...own.matchAll(/ id="([^"]+)"/g)].every((m) => /^lts[A-Za-z0-9_-]*-.+-shade$/.test(m[1] ?? ''))).toBe(
      true,
    );
  });
});
