import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Disable the service worker during local development so the browser
      // never serves a stale cached build while you iterate on the app.
      devOptions: {
        enabled: false
      },
      includeAssets: ['pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'Personal Vault',
        short_name: 'Vault',
        description: 'Private password and banking vault',
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
  ]
})
