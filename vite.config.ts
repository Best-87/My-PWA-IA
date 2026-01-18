
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  define: {
    // Esto reemplaza literalmente 'process.env.API_KEY' por el valor real durante el build en Vercel
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});
