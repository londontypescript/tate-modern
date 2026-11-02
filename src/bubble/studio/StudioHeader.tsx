import { Suspense, useMemo, type ReactNode } from 'react';
import { layoutBanner, type BannerOptions } from '../banner';
import { BannerSvg } from '../banner/BannerSvg';
import { stripCanvas } from '../banner/layout';
import type { BubbleFonts } from '../wordmark/fonts';
import { pageColumn } from './TopicLayout';

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
 * The studio's header: its banner across the page's content column, whose
 * sunset band is the header's lower edge. The heading's name is plain
 * text, "London TypeScript Studio"; the picture carries a name of its own,
 * so it is hidden from assistive technology and the heading isn't read
 * twice. The banner waits
 * for the fonts in its own Suspense, inside a block already the strip's
 * shape, so nothing below moves when it appears.
 */
export function StudioHeader({ banner }: { banner: ReactNode }) {
  return (
    <header className="bg-white px-6 pt-4">
      <h1 className={pageColumn}>
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
    </header>
  );
}
