import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Suspense fallback={<p className="p-8 text-stone-500">Loading fonts…</p>}>
      <App />
    </Suspense>
  </StrictMode>,
);
