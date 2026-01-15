import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative paths for assets (critical for GitHub Pages)
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  define: {
    // Inject the API KEY from the build environment
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});