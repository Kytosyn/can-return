import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: false, // we provide our own manifest.json
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,json}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.returnright\.sg\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "return-points-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          scanner: ["barcode-detector"],
          map: ["leaflet", "react-leaflet"],
          tf: ["@tensorflow/tfjs", "@tensorflow-models/mobilenet"],
        },
      },
    },
  },
});
