import { useState, type ReactNode } from 'react';
import { ReferencePanel } from './ReferencePanel';
import { readLocal, writeLocal } from './storage';
import { Toggle } from './ui';

const SHOW_REFERENCE_KEY = 'lts-studio:show-reference';

/**
 * The two-column layout every concept uses: previews on the left (with an
 * optional reference image above them for comparison) and controls on the
 * right. On wide screens each column scrolls on its own below the header,
 * so the previews stay in view while the controls are scrolled.
 */
export function StudioLayout({ previews, controls }: { previews: ReactNode; controls: ReactNode }) {
  const [showReference, setShowReference] = useState(() => readLocal(SHOW_REFERENCE_KEY) !== 'false');
  const toggleReference = (show: boolean) => {
    setShowReference(show);
    writeLocal(SHOW_REFERENCE_KEY, String(show));
  };

  return (
    <div className="grid gap-6 p-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_22rem] lg:py-0">
      <main className="space-y-6 lg:overflow-y-auto lg:overscroll-contain lg:py-6">
        <div className="-mt-3 flex justify-end">
          <Toggle label="Compare with a reference" checked={showReference} onChange={toggleReference} />
        </div>
        {showReference ? (
          <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="2xl:sticky 2xl:top-0">
              <ReferencePanel />
            </div>
            <div className="space-y-6">{previews}</div>
          </div>
        ) : (
          previews
        )}
      </main>
      <aside className="space-y-4 lg:overflow-y-auto lg:overscroll-contain lg:py-6 lg:pr-1">{controls}</aside>
    </div>
  );
}
