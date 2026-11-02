import { Suspense, useMemo, type ReactNode } from 'react';
import { layoutBanner, type BannerOptions } from '../banner';
import { BannerSvg } from '../banner/BannerSvg';
import { stripCanvas } from '../banner/layout';
import type { BubbleFonts } from '../wordmark/fonts';

/** The studio's own banner: as an LTS repo's README would carry it, on the light page. */
const headerBanner = {
  text: 'Studio',
  theme: 'light',
  band: 'bottom',
  align: 'left',
  framing: 'strip',
} as const satisfies BannerOptions;

/** The header's banner, drawn live from the fonts by the same renderer as every banner download. */
export function HeaderBanner({
  fonts,
  lettering,
}: {
  fonts: Pick<BubbleFonts, 'wordmark' | 'bannerText'>;
  lettering: string;
}) {
  const layout = useMemo(() => layoutBanner(fonts, headerBanner), [fonts]);
  return <BannerSvg layout={layout} lettering={lettering} className="block h-auto w-full" />;
}

/**
 * The studio's header: its banner, whose sunset band is the header's lower
 * edge, and the link to the 0.4.0 studio. The heading's name is plain text,
 * "London TypeScript Studio"; the picture carries a name of its own, so it
 * is hidden from assistive technology and the heading isn't read twice. The banner
 * waits for the fonts in its own Suspense, inside a box already the strip's
 * shape, so nothing below moves when it appears.
 */
export function StudioHeader({ banner }: { banner: ReactNode }) {
  return (
    <header className="bg-white px-6 pt-4">
      <div className="flex flex-col-reverse gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
        <h1 className="w-full max-w-[720px] min-w-0">
          <span className="sr-only">London TypeScript Studio</span>
          <span
            aria-hidden="true"
            data-header-banner
            className="block w-full"
            style={{ aspectRatio: `${stripCanvas.width} / ${stripCanvas.height}` }}
          >
            <Suspense fallback={null}>{banner}</Suspense>
          </span>
        </h1>
        <div className="space-y-1 text-sm md:shrink-0 md:text-right">
          <a href="./legacy.html" className="font-medium text-blue-700 underline">
            The 0.4.0 studio (Flat, 3D, Projected)
          </a>
          <p className="text-stone-500">The bubble logo, drawn in TypeScript. Change it in code.</p>
        </div>
      </div>
    </header>
  );
}
