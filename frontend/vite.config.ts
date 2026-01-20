import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// API target: use env var for Docker, default to localhost
const API_TARGET = process.env.VITE_API_URL || 'http://localhost:8001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3009,
    strictPort: true,
    host: true, // Allow external connections (needed for Docker)
    proxy: {
      '/api': {
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
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          tanstack: ['@tanstack/react-query', '@tanstack/react-table'],
        },
      },
    },
  },
})
