import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false
      },
      includeAssets: ['brand/kept-icon.png', 'brand/kept-logo.png', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'Kept',
        short_name: 'Kept',
        description: 'Zero-knowledge personal vault for passwords, banking and secure notes',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'vendor-supabase'
            if (id.includes('motion')) return 'vendor-motion'
            if (id.includes('lucide-react')) return 'vendor-icons'
            if (id.includes('@noble/hashes')) return 'vendor-crypto'
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react'
            return 'vendor-misc'
          }
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
})
