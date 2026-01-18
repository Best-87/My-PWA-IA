
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // Changed from './' to '/' for better PWA support on Vercel
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  define: {
    // Inyección de la API Key proporcionada para el funcionamiento de la IA
    'process.env.API_KEY': JSON.stringify('AIzaSyBMwekt7M3WsNMT5E4rEKADKuVaMXU2NiA')
  }
});