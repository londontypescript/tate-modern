import { useState } from 'react';
import { references } from './references';
import { readLocal, writeLocal } from './storage';
import { Panel } from './ui';

const STORAGE_KEY = 'lts-studio:reference';

/** One of the reference images, chosen by the viewer, for side-by-side comparison. */
export function ReferencePanel() {
  const [id, setId] = useState(() => readLocal(STORAGE_KEY) ?? references[0]?.id);
  const reference = references.find((r) => r.id === id) ?? references[0];
  if (!reference) return null;

  const choose = (next: string) => {
    setId(next);
    writeLocal(STORAGE_KEY, next);
  };

  return (
    <Panel title="Reference">
      <div className="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Reference image">
        {references.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={r.id === reference.id}
            onClick={() => choose(r.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              r.id === reference.id
                ? 'bg-stone-800 text-white'
                : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>
      <div className="rounded-lg p-4" style={{ backgroundColor: reference.background }}>
        <img
          src={reference.src}
          alt={reference.description}
          className="mx-auto block max-h-[40vh] w-auto max-w-full object-contain"
        />
      </div>
      <p className="mt-2 text-xs text-stone-500">{reference.description}</p>
    </Panel>
  );
}
