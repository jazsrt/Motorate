import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import removeConsole from 'vite-plugin-remove-console';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Remove console.log in production builds
    removeConsole({
      includes: ['log', 'debug', 'info'],
      excludes: ['error', 'warn'],
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  publicDir: 'public',
  build: {
    copyPublicDir: true,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-is'],
          'supabase': ['@supabase/supabase-js'],
          'charts': ['recharts'],
          'map': ['leaflet', 'react-leaflet'],
          'qr': ['qrcode.react', 'jsqr'],
          'icons': ['lucide-react'],
          'ocr': ['tesseract.js'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
