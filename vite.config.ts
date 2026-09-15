import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes the build path-agnostic, so the same artifact works at
// https://user.github.io/, https://user.github.io/repo/ or a custom domain
// without ever editing this file. Routing uses hashes for the same reason.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src/', import.meta.url).pathname.replace(/\/$/, ''),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', '@dnd-kit/modifiers'],
        },
      },
    },
  },
});
