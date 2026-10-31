import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** The pages the build writes to `dist`: the bubble's studio, and the frozen 0.4.0 studio beside it. */
const pages = {
  main: fileURLToPath(new URL('index.html', import.meta.url)),
  legacy: fileURLToPath(new URL('legacy.html', import.meta.url)),
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The 3D concept's chunk carries three.js (about 1 MB); it loads only
    // when that concept is opened, so it needn't trigger the size warning.
    chunkSizeWarningLimit: 1200,
    rolldownOptions: { input: pages },
  },
  test: {
    environment: 'node',
    // Only the project's own folders: agents' worktrees (.temple-bar/,
    // .claude/worktrees/) hold whole copies of the repo, tests included.
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    // Some tests render and sample a lot (seed sweeps, contrast over every
    // pixel, resvg reference renders), and on a slower machine they take
    // several times vitest's 5 s default with nothing wrong. A timeout here
    // only stops a stuck or runaway test; it checks nothing about the result,
    // so a larger budget keeps every assertion while letting them finish.
    testTimeout: 30_000,
  },
});
