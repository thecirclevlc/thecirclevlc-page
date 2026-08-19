import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Keep the icon set in one chunk.
         *
         * MEASURED, not guessed: the home page was making 42 requests and
         * fifteen of them were single lucide icons — `eye.js`, `copy.js`,
         * `plus.js`, `x.js` — around 300 bytes each. On a phone on slow 4G each
         * one still costs its own round trip, 400 to 1100ms, and the first
         * paint waits for the last of them. The page was never short of
         * bandwidth at 304kB total; it was drowning in latency.
         *
         * Only the icons are grouped by hand. Splitting React or the router out
         * of the chunks that consume them reorders module initialisation and
         * the app dies on load with "Cannot read properties of undefined
         * (reading 'createContext')" — verified in the browser, not theorised.
         * Rollup's own grouping is right about everything except this one leaf.
         */
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) return 'icons';
        },
      },
    },
  },
});
