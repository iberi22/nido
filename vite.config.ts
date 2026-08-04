import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'NIDO',
        short_name: 'NIDO',
        start_url: '/',
        display: 'standalone',
        background_color: '#020617',
        theme_color: '#020617',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          // Legacy paths to support original compliance tests in pwa-registration.test.ts
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === '/',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'nido-index',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              }
            }
          },
          {
            urlPattern: ({ url }) => /\.(?:js|css|html)$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'nido-assets',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: ({ url }) => /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'nido-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('three/')) {
            return 'vendor-three';
          }
          if (id.includes('node_modules/@iberi22/edge-mesh') || id.includes('vendor/edge-mesh')) {
            return 'vendor-mesh';
          }
          if (id.includes('node_modules/@swal/ui') || id.includes('vendor/swal-ui')) {
            return 'vendor-swal';
          }
        }
      }
    }
  }
})
