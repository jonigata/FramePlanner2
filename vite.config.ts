import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'
import glob from 'glob'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        farm: resolve(__dirname, 'farm.html'),
        viewer: resolve(__dirname, 'viewer.html'),
        ...Object.fromEntries(
          glob.sync('ads/**/index.html').map(file => [
            file.slice(0, -11), // remove '/index.html'
            resolve(__dirname, file)
          ])
        )
      }
    },
    outDir: 'dist'
  },
  plugins: [svelte()],
  optimizeDeps: {
    include: ['paper'],
  },
  server: {
    port: 5173,
    proxy: {
      '^/farm/?$': {
        target: 'http://localhost:5173',
        rewrite: (path) => '/farm.html',
      },
      '^/farm/user/(.*)': {
        target: 'http://localhost:5173',
        rewrite: (path) => '/farm.html',
      },
      '^/viewer/(.*)': {
        target: 'http://localhost:5001',
        rewrite: (path) => `/frameplanner-e5569/us-central1/socialcard/${path.split('/').pop()}`,
      }
    }    
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec,vitest}.{js,ts}'],
    setupFiles: ['./test/setup.ts'],
  },
})
