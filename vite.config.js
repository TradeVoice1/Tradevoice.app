import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The trade catalog (56 files of material/equipment/labor data) and the
    // Stripe + Supabase SDKs each get their own chunk so the main app bundle
    // is leaner and browsers cache them independently of code changes.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/data/trades/')) return 'trades-data';
          if (id.includes('/@stripe/'))         return 'stripe';
          if (id.includes('/@supabase/'))       return 'supabase';
          return undefined;
        },
      },
    },
    // The main app bundle is naturally large (single-file App.jsx with all
    // screens inlined); the warning is informational, not a regression. Bump
    // so a clean build doesn't yell at us.
    chunkSizeWarningLimit: 800,
  },
})
