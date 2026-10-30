import { Suspense, use, useMemo, useState } from 'react';
import { loadLogoFonts } from '../../shared/react/fonts.browser';
import { loadBubbleFonts } from '../wordmark/fonts.browser';
import { buildBubble, themes, tileLettering, type Theme } from '../engine';
import { bubbleFileName, renderBubbleSvg } from '../react/renderSvg';
import { downloadSvg } from './download';
import { LockupPreviews } from './LockupPreviews';
import { LargePreviews, SizeRow } from './Previews';

type ThemeChoice = Theme | 'both';

const themeChoices: { id: ThemeChoice; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'both', label: 'Both' },
];

const themeNames: Record<Theme, string> = { light: 'Light theme', dark: 'Dark theme' };

/**
 * The bubble logo's studio: the emblem in each theme, large and at real
 * sizes, beside the committed reference, then the lockup with its Exo 2
 * wordmark, with SVG downloads. Nothing is
 * tuned here; the drawing is changed in code.
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
  const [choice, setChoice] = useState<ThemeChoice>('both');
  const shown = themes.filter((t) => choice === 'both' || choice === t);

  return (
    <main className="space-y-8 p-6">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-600">Theme</span>
          <div role="radiogroup" aria-label="Theme" className="flex gap-1 rounded-lg bg-stone-200 p-1">
            {themeChoices.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={c.id === choice}
                onClick={() => setChoice(c.id)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  c.id === choice ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-600">Download SVG</span>
          {themes.map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => downloadSvg(bubbleFileName(theme), renderBubbleSvg(theme, lettering))}
              className="rounded-md border border-stone-300 bg-white px-3 py-1 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              {theme === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </div>
      {shown.map((theme) => (
        <section key={theme} aria-labelledby={`theme-${theme}`} className="space-y-4">
          <h2 id={`theme-${theme}`} className="text-base font-semibold">
            {themeNames[theme]}
          </h2>
          <LargePreviews drawing={buildBubble({ theme, detail: 'full', lettering })} />
          <h3 className="text-sm font-semibold text-stone-700">At real sizes</h3>
          <SizeRow theme={theme} lettering={lettering} />
          <h3 className="text-sm font-semibold text-stone-700">Lockup</h3>
          <LockupPreviews theme={theme} font={bubbleFonts.wordmark} lettering={lettering} />
        </section>
      ))}
      {/* Previews of where the logo lands are added below. */}
    </main>
  );
}
