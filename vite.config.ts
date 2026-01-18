
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
    // Inyección de la API Key proporcionada para el funcionamiento de la IA
    'process.env.API_KEY': JSON.stringify('AIzaSyDe6gJT04mdDwaQu9az58nzZQQyx5PX7Y0')
  }
});
