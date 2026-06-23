import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    host: "::",
    port: Number(process.env.PORT) || Number(process.env.VITE_DEV_PORT) || 5173,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      devOptions: { enabled: false },
      filename: "sw.js",
      manifestFilename: "manifest.webmanifest",
      includeAssets: ["favicon.ico", "manifest.json"],
      manifest: {
        name: "Continuum",
        short_name: "Continuum",
        description: "Personal Knowledge Management Platform",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        theme_color: "#000000",
        background_color: "#000000",
        categories: ["productivity"],
        icons: [
          {
            src: "/favicon.ico",
            sizes: "any",
            type: "image/x-icon",
            purpose: "any",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf}"],
        runtimeCaching: [
          {
            // App shell HTML — fresh first, fallback to cache offline.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "continuum-html",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Fonts.
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.gstatic.com" ||
              url.origin === "https://fonts.googleapis.com",
            handler: "CacheFirst",
            options: {
              cacheName: "continuum-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Wallpaper + vault images (Backblaze B2 signed URLs, or app/account/wallpaper).
            urlPattern: ({ url, request }) =>
              request.destination === "image" &&
              (url.pathname.includes("/account/wallpaper") ||
                url.pathname.includes("/vault/") ||
                url.hostname.includes("backblaze")),
            handler: "CacheFirst",
            options: {
              cacheName: "continuum-images",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "lucide-react": path.resolve(__dirname, "./src/lib/heroicons.ts"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
