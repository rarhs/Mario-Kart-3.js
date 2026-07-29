import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import glsl from 'vite-plugin-glsl'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Set VITE_BASE when deploying under a sub-path (e.g. GitHub Pages)
  base: process.env.VITE_BASE || '/',
  plugins: [react(), glsl(), VitePWA({
       registerType: 'autoUpdate',
       includeAssets: [ 'favicon.ico'],
       workbox: {
         // the main bundle is ~2.6 MB, above workbox's 2 MiB precache default
         maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
       },
       manifest: {
         name: 'Mario Kart 3.js',
         short_name: 'MK3.JS',
         start_url: '/',
         display: 'standalone',
         background_color: '#FF0000',
         theme_color: '#FF0000',
         icons: [
           {
             src: 'icon.webp',
             sizes: '192x192',
             type: 'image/webp'
           },
          
         ]
       }
     })],
})
