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
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.{test,spec,vitest}.{js,ts}']
	},
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  }
})
