import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import checker from 'vite-plugin-checker'
import { compression } from 'vite-plugin-compression2'

// API target: use env var for Docker, default to localhost
// Use 127.0.0.1 instead of localhost to avoid Windows DNS resolution delay (~2s)
const API_TARGET = process.env.VITE_API_URL || 'http://127.0.0.1:8001'

const isProduction = process.env.NODE_ENV === 'production'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // SWC-based React transform — ~10x faster HMR than Babel
    react(),

    // TypeScript errors shown as browser overlay during dev (non-blocking)
    checker({
      typescript: true,
      enableBuild: false, // don't block prod builds; tsc -b already runs in "build" script
    }),

    // Bundle size visualizer — writes stats.html after every production build
    isProduction &&
      visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),

    // Pre-compress all JS/CSS/JSON assets with gzip during build.
    // Nginx serves the .gz files directly (gzip_static on) — zero per-request CPU cost.
    isProduction &&
      compression({
        algorithms: ['gzip'],
        exclude: [/\.(html|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/],
        threshold: 1024, // Only compress files > 1KB
      }),

  ],
  server: {
    port: 3009,
    strictPort: true,
    host: true, // Allow external connections (needed for Docker)
    proxy: {
      '/api/': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext', // Modern browsers for smaller bundle
    sourcemap: false, // Disable sourcemaps in production
    minify: 'esbuild', // Fast minification
    chunkSizeWarningLimit: 1200, // VendorProfile/StoryNarrative are ~150KB — expected
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React + routing
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Recharts — used across many chart components
          'vendor-recharts': ['recharts'],
          // D3 / Sankey — used in MoneyFlow
          'vendor-d3': ['d3-sankey'],
          // TanStack family - used across many pages
          'vendor-tanstack': [
            '@tanstack/react-query',
            '@tanstack/react-table',
            '@tanstack/react-virtual',
          ],
          // UI library components
          'vendor-radix': [
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-progress',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
          // i18n
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // Command palette
          'vendor-cmdk': ['cmdk'],
          // URL state
          'vendor-nuqs': ['nuqs'],
          // Utilities
          'vendor-utils': [
            'axios',
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
            'zustand',
            'scrollama',
            'html-to-image',
          ],
          // Icons - often large
          'vendor-icons': ['lucide-react'],
          // GSAP — only used by Intro.tsx splash screen
          'vendor-gsap': ['gsap'],
          // Framer Motion — used by RedThread and editorial components
          'vendor-motion': ['framer-motion'],
          // ECharts — used by echarts-for-react components
          'vendor-echarts': ['echarts', 'echarts-for-react'],
        },
      },
    },
  },
  // Optimize dependencies for faster dev server
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@tanstack/react-table',
      '@tanstack/react-virtual',
      'recharts',
      'axios',
      'lucide-react',
    ],
  },
})
