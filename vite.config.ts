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
  },
});
