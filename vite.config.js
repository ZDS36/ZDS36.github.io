import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: fileURLToPath(new URL('./app', import.meta.url)),
  base: '/',
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('./.site-build', import.meta.url)),
    emptyOutDir: false,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/site.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/site[extname]'
      }
    }
  }
});
