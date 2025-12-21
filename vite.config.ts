import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  root: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist/renderer',
    sourcemap: true
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src')
    }
  }
});

