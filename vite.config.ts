import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'events': resolve(__dirname, './src/lib/polyfills/events.ts'),
      'path': resolve(__dirname, './src/lib/polyfills/path.ts'),
      'stream': resolve(__dirname, './src/lib/polyfills/stream.ts'),
      'url': resolve(__dirname, './src/lib/polyfills/url.ts'),
      'jsonwebtoken': resolve(__dirname, './src/lib/polyfills/jsonwebtoken.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // All /api/* routes → production MetaCall (keeps /api prefix, no rewrite)
      '/api': {
        target: 'https://dashboard.metacall.io',
        changeOrigin: true,
        secure: true,
      },
      '/login': {
        target: 'https://dashboard.metacall.io',
        changeOrigin: true,
        secure: true,
        // Bypass for browser page navigations (GET with text/html Accept).
        // These should be served by the SPA (index.html), not the API proxy.
        // Only POST requests (actual auth calls) reach the backend.
        bypass(req) {
          if (req.headers['accept']?.includes('text/html')) return '/index.html';
        },
      },
      '/signup': {
        target: 'https://dashboard.metacall.io',
        changeOrigin: true,
        secure: true,
        bypass(req) {
          if (req.headers['accept']?.includes('text/html')) return '/index.html';
        },
      },
      '/validate': {
        target: 'https://dashboard.metacall.io',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'clsx'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*_test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/main.tsx',
      ],
    },
  },
});
