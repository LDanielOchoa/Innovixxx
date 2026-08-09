import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('pinia')) {
              return 'vendor-vue'
            }
            if (id.includes('primevue') || id.includes('@primevue')) {
              return 'vendor-primevue'
            }
            if (id.includes('@hugeicons') || id.includes('lucide-vue-next')) {
              return 'vendor-icons'
            }
            return 'vendor'
          }
        }
      }
    }
  },
  server: {
    allowedHosts: ['innovix.gfandino.xyz'],
    proxy: {
      '/ws-flota': {
        target: 'ws://66.179.190.248:8901',
        changeOrigin: true,
        ws: true,
        rewrite: (path: string) => path.replace(/^\/ws-flota/, '')
      },
      '/api': {
        target: 'https://innovix.gfandino.xyz',
        changeOrigin: true,
        secure: true
      },
      '/media': {
        target: 'https://innovix.gfandino.xyz',
        changeOrigin: true,
        secure: true
      }
    }
  }
})
