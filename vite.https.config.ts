import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'
import { glob } from 'glob'
import * as path from 'path'
import { visualizer } from "rollup-plugin-visualizer";
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...Object.fromEntries(
          glob.sync('ads/**/index.html').map(file => [
            file.slice(0, -11), // remove '/index.html'
            resolve(__dirname, file)
          ])
        )
      }
    },
    outDir: 'dist',
  },
  plugins: [svelte(), visualizer()],
  resolve: {
    alias: {
      $bookTypes: path.resolve(__dirname, 'src/lib/book/types'),
      $protocolTypes: path.resolve(__dirname, 'src/utils/edgeFunctions/types'),
    }    
  },
  optimizeDeps: {
    include: ['paper'],
  },
  server: {
    host: 'frameplanner.example.local',
    port: 3000,
    https: {
      key: fs.readFileSync('./frameplanner.example.local-key.pem'),
      cert: fs.readFileSync('./frameplanner.example.local.pem'),
    },
  },  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec,vitest}.{js,ts}'],
    setupFiles: ['./test/setup.ts'],
  },
})
