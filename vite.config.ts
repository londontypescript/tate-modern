import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The 3D concept's chunk carries three.js (about 1 MB); it loads only
    // when that concept is opened, so it needn't trigger the size warning.
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    // Only the project's own folders: agents' worktrees (.temple-bar/,
    // .claude/worktrees/) hold whole copies of the repo, tests included.
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
});
