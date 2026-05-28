import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.png",
        "apple-touch-icon.png",
        "mask-icon.svg",
        "pwa-192x192.png",
        "pwa-512x512.png",
      ],
      manifest: {
        name: "Telegram Clone",
        short_name: "Telegram",
        description: "Mensagens em tempo real com Firebase",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        lang: "pt-BR",
        categories: ["social", "communication"],
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webp}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/__/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/.*\.cloudinary\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "cloudinary-images",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-static",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
