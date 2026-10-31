import { Suspense, use, useMemo } from 'react';
import { loadLogoFonts } from '../../shared/react/fonts.browser';
import { loadBubbleFonts } from '../wordmark/fonts.browser';
import { tileLettering } from '../engine';
import { StudioPage } from './StudioPage';

/**
 * The bubble logo's studio: the emblem large and at real sizes beside the
 * committed reference, every detail step at every size, the lockup with its
 * Exo 2 wordmark, and each slot's image as its recipe composes it, every
 * topic in a light and a dark column, with SVG downloads. Nothing is tuned
 * here; the drawing is changed in code.
 */
export function App() {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-stone-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">London TypeScript's logo</h1>
          <p className="text-sm text-stone-500">The bubble emblem, drawn in TypeScript. Change it in code.</p>
        </div>
        <a href="./legacy.html" className="text-sm font-medium text-blue-700 underline">
          The 0.4.0 studio (Flat, 3D, Projected)
        </a>
      </header>
      <Suspense fallback={<p className="p-8 text-stone-500">Loading the fonts…</p>}>
        <Studio />
      </Suspense>
    </div>
  );
}

function Studio() {
  const fonts = use(loadLogoFonts());
  const bubbleFonts = use(loadBubbleFonts());
  const lettering = useMemo(() => tileLettering(fonts.sans), [fonts]);
  return <StudioPage lettering={lettering} font={bubbleFonts.wordmark} />;
}
