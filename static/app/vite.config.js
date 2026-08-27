import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — Forge serves Custom UI static resources from a per-install,
// non-root path, so asset URLs must be relative.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
