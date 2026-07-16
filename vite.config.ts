import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  // Load .env files so we can reference them in config (e.g. for base URL)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
    figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/app'),
      },
    },

    // ── Build optimizations for Vercel ────────────────────────────────
    build: {
      // Target modern browsers (Vercel edge network handles legacy clients)
      target: 'es2020',
      // Emit source maps in production so Vercel error tracking is useful
      sourcemap: mode === 'production' ? 'hidden' : true,
      rollupOptions: {
        output: {
          // Manual chunking: split vendor libs so the main bundle stays small
          manualChunks: {
            // React core
            'react-vendor': ['react', 'react-dom'],
            // Firebase SDK — split per service to allow tree-shaking
            'firebase-app':       ['firebase/app'],
            'firebase-auth':      ['firebase/auth'],
            'firebase-firestore': ['firebase/firestore'],
            'firebase-functions': ['firebase/functions'],
            // UI component library
            'radix-ui': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-popover',
            ],
            // Charts
            'recharts': ['recharts'],
          },
        },
      },
      // Warn (not error) when a chunk exceeds 600 kB
      chunkSizeWarningLimit: 600,
    },

    // ── Dev server ────────────────────────────────────────────────────
    server: {
      port: 5173,
      strictPort: false,
    },

    // ── Preview server (used by `vite preview`) ───────────────────────
    preview: {
      port: 4173,
    },

    // ── Environment variable prefix exposed to client code ────────────
    // Variables must be prefixed with VITE_ to be exposed in the browser.
    // This is the Vite default; listed here for documentation purposes.
    envPrefix: 'VITE_',
  }
})
