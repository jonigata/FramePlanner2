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
  },
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.{test,spec,vitest}.{js,ts}']
	},
})
