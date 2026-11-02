import { Suspense, use, useMemo } from 'react';
import { loadLogoFonts } from '../../shared/react/fonts.browser';
import { loadBubbleFonts } from '../wordmark/fonts.browser';
import { tileLettering } from '../engine';
import { HeaderBanner, StudioHeader } from './StudioHeader';
import { StudioPage } from './StudioPage';

/**
 * The bubble logo's studio: the emblem large and at real sizes beside the
 * committed reference, every detail step at every size, the lockup with its
 * Exo 2 wordmark, the banner, and each slot's image as its recipe composes
 * it, every topic in a light and a dark column, with downloads. Nothing is
 * tuned here; the drawing is changed in code.
 */
export function App() {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <StudioHeader banner={<LiveHeaderBanner />} />
      <Suspense fallback={<p className="p-8 text-stone-500">Loading the fonts…</p>}>
        <Studio />
      </Suspense>
    </div>
  );
}

/** The fonts the header and the page both draw with; each loader fetches once, so the two share them. */
function useStudioFonts() {
  const logoFonts = use(loadLogoFonts());
  const fonts = use(loadBubbleFonts());
  const lettering = useMemo(() => tileLettering(logoFonts.sans), [logoFonts]);
  return { fonts, lettering };
}

function LiveHeaderBanner() {
  const { fonts, lettering } = useStudioFonts();
  return <HeaderBanner fonts={fonts} lettering={lettering} />;
}

function Studio() {
  const { fonts, lettering } = useStudioFonts();
  return <StudioPage lettering={lettering} fonts={fonts} />;
}
