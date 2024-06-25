import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: false,
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
})
