import { Suspense, useEffect, useState } from 'react';
import { concepts } from './concepts';

const conceptFromHash = () => {
  const id = window.location.hash.slice(1);
  return concepts.find((c) => c.id === id) ?? concepts[0];
};

/**
 * London TypeScript's logo design system: a switcher across the logo concepts. The open
 * concept is kept in the URL hash (`#flat`), so reloads and links keep it.
 */
export function App() {
  const [concept, setConcept] = useState(conceptFromHash);

  useEffect(() => {
    const onHashChange = () => setConcept(conceptFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (!concept) return null;
  const { Component } = concept;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 lg:flex lg:h-screen lg:flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-stone-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">London TypeScript's logo design system</h1>
          <p className="text-sm text-stone-500">{concept.summary}</p>
          <p className="text-sm text-stone-500">
            The 0.4.0 studio, frozen.{' '}
            <a href="./" className="font-medium text-blue-700 underline">
              The current logo’s studio
            </a>
          </p>
        </div>
        <nav aria-label="Concepts" className="flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1">
          {concepts.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              aria-current={c.id === concept.id ? 'page' : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                c.id === concept.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {c.name}
            </a>
          ))}
        </nav>
      </header>
      <Suspense fallback={<p className="p-8 text-stone-500">Loading {concept.name}…</p>}>
        <Component key={concept.id} />
      </Suspense>
    </div>
  );
}
