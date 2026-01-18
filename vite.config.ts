
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  define: {
    // Ya no inyectamos la clave en el frontend por seguridad
    'process.env.API_KEY': JSON.stringify('') 
  }
});
