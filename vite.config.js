import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logoo.png', 'logo192.jpg', 'logo512.png'],
      manifest: {
        name: 'Light UP Interactive Bible Game App',
        short_name: 'Light UP',
        description: 'A Bible Immersive and Educative Game',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'logo192.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'logo512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff2,mp3,wav,m4a}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit for large audio/image files
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/rhanvchqlilmzxmufode\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8080,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
}));
