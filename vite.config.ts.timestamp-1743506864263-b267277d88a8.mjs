// vite.config.ts
import { defineConfig } from "file:///home/hirayama/FramePlanner/node_modules/vitest/dist/config.js";
import { svelte } from "file:///home/hirayama/FramePlanner/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import { resolve } from "path";
import glob from "file:///home/hirayama/FramePlanner/node_modules/glob/glob.js";
import * as path from "path";
import { visualizer } from "file:///home/hirayama/FramePlanner/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var __vite_injected_original_dirname = "/home/hirayama/FramePlanner";
var vite_config_default = defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      input: {
        main: resolve(__vite_injected_original_dirname, "index.html"),
        ...Object.fromEntries(
          glob.sync("ads/**/index.html").map((file) => [
            file.slice(0, -11),
            // remove '/index.html'
            resolve(__vite_injected_original_dirname, file)
          ])
        )
      }
    },
    outDir: "dist"
  },
  plugins: [svelte(), visualizer()],
  resolve: {
    alias: {
      $bookTypes: path.resolve(__vite_injected_original_dirname, "src/lib/book/types"),
      $protocolTypes: path.resolve(__vite_injected_original_dirname, "src/utils/edgeFunctions/types")
    }
  },
  optimizeDeps: {
    include: ["paper"]
  },
  server: {
    host: "frameplanner.example.local",
    port: 5173,
    proxy: {
      "^/farm/?$": {
        target: "http://localhost:5173",
        rewrite: (path2) => "/farm.html"
      },
      "^/farm/user/(.*)": {
        target: "http://localhost:5173",
        rewrite: (path2) => "/farm.html"
      },
      "^/viewer/(.*)": {
        target: "http://localhost:5001",
        rewrite: (path2) => `/frameplanner-e5569/us-central1/socialcard/${path2.split("/").pop()}`
      }
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec,vitest}.{js,ts}"],
    setupFiles: ["./test/setup.ts"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9oaXJheWFtYS9GcmFtZVBsYW5uZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2hpcmF5YW1hL0ZyYW1lUGxhbm5lci92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9oaXJheWFtYS9GcmFtZVBsYW5uZXIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJ1xuaW1wb3J0IHsgc3ZlbHRlIH0gZnJvbSAnQHN2ZWx0ZWpzL3ZpdGUtcGx1Z2luLXN2ZWx0ZSdcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJ1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYidcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tIFwicm9sbHVwLXBsdWdpbi12aXN1YWxpemVyXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBidWlsZDoge1xuICAgIG1pbmlmeTogZmFsc2UsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgaW5wdXQ6IHtcbiAgICAgICAgbWFpbjogcmVzb2x2ZShfX2Rpcm5hbWUsICdpbmRleC5odG1sJyksXG4gICAgICAgIC4uLk9iamVjdC5mcm9tRW50cmllcyhcbiAgICAgICAgICBnbG9iLnN5bmMoJ2Fkcy8qKi9pbmRleC5odG1sJykubWFwKGZpbGUgPT4gW1xuICAgICAgICAgICAgZmlsZS5zbGljZSgwLCAtMTEpLCAvLyByZW1vdmUgJy9pbmRleC5odG1sJ1xuICAgICAgICAgICAgcmVzb2x2ZShfX2Rpcm5hbWUsIGZpbGUpXG4gICAgICAgICAgXSlcbiAgICAgICAgKVxuICAgICAgfVxuICAgIH0sXG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gIH0sXG4gIHBsdWdpbnM6IFtzdmVsdGUoKSwgdmlzdWFsaXplcigpXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAkYm9va1R5cGVzOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2xpYi9ib29rL3R5cGVzJyksXG4gICAgICAkcHJvdG9jb2xUeXBlczogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy91dGlscy9lZGdlRnVuY3Rpb25zL3R5cGVzJyksXG4gICAgfSAgICBcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogWydwYXBlciddLFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiAnZnJhbWVwbGFubmVyLmV4YW1wbGUubG9jYWwnLFxuICAgIHBvcnQ6IDUxNzMsXG4gICAgcHJveHk6IHtcbiAgICAgICdeL2Zhcm0vPyQnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTE3MycsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiAnL2Zhcm0uaHRtbCcsXG4gICAgICB9LFxuICAgICAgJ14vZmFybS91c2VyLyguKiknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTE3MycsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiAnL2Zhcm0uaHRtbCcsXG4gICAgICB9LFxuICAgICAgJ14vdmlld2VyLyguKiknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMScsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBgL2ZyYW1lcGxhbm5lci1lNTU2OS91cy1jZW50cmFsMS9zb2NpYWxjYXJkLyR7cGF0aC5zcGxpdCgnLycpLnBvcCgpfWAsXG4gICAgICB9XG4gICAgfSAgICBcbiAgfSxcbiAgdGVzdDoge1xuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgaW5jbHVkZTogWydzcmMvKiovKi57dGVzdCxzcGVjLHZpdGVzdH0ue2pzLHRzfSddLFxuICAgIHNldHVwRmlsZXM6IFsnLi90ZXN0L3NldHVwLnRzJ10sXG4gIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFtUSxTQUFTLG9CQUFvQjtBQUNoUyxTQUFTLGNBQWM7QUFDdkIsU0FBUyxlQUFlO0FBQ3hCLE9BQU8sVUFBVTtBQUNqQixZQUFZLFVBQVU7QUFDdEIsU0FBUyxrQkFBa0I7QUFMM0IsSUFBTSxtQ0FBbUM7QUFRekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ2IsT0FBTztBQUFBLFFBQ0wsTUFBTSxRQUFRLGtDQUFXLFlBQVk7QUFBQSxRQUNyQyxHQUFHLE9BQU87QUFBQSxVQUNSLEtBQUssS0FBSyxtQkFBbUIsRUFBRSxJQUFJLFVBQVE7QUFBQSxZQUN6QyxLQUFLLE1BQU0sR0FBRyxHQUFHO0FBQUE7QUFBQSxZQUNqQixRQUFRLGtDQUFXLElBQUk7QUFBQSxVQUN6QixDQUFDO0FBQUEsUUFDSDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsU0FBUyxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUM7QUFBQSxFQUNoQyxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxZQUFpQixhQUFRLGtDQUFXLG9CQUFvQjtBQUFBLE1BQ3hELGdCQUFxQixhQUFRLGtDQUFXLCtCQUErQjtBQUFBLElBQ3pFO0FBQUEsRUFDRjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLE9BQU87QUFBQSxFQUNuQjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsYUFBYTtBQUFBLFFBQ1gsUUFBUTtBQUFBLFFBQ1IsU0FBUyxDQUFDQSxVQUFTO0FBQUEsTUFDckI7QUFBQSxNQUNBLG9CQUFvQjtBQUFBLFFBQ2xCLFFBQVE7QUFBQSxRQUNSLFNBQVMsQ0FBQ0EsVUFBUztBQUFBLE1BQ3JCO0FBQUEsTUFDQSxpQkFBaUI7QUFBQSxRQUNmLFFBQVE7QUFBQSxRQUNSLFNBQVMsQ0FBQ0EsVUFBUyw4Q0FBOENBLE1BQUssTUFBTSxHQUFHLEVBQUUsSUFBSSxDQUFDO0FBQUEsTUFDeEY7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsTUFBTTtBQUFBLElBQ0osU0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsU0FBUyxDQUFDLHFDQUFxQztBQUFBLElBQy9DLFlBQVksQ0FBQyxpQkFBaUI7QUFBQSxFQUNoQztBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiXQp9Cg==
