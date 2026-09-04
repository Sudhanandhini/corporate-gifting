import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  // The production build is served from https://sunsysweb.co.in/gift, so
  // asset URLs need that prefix; local dev keeps serving from the root.
  base: mode === 'production' ? '/gift/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forwards /api/* to the Express server during development.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
}));
