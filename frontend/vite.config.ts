import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

export default defineConfig({
  plugins: [react(),
    tailwindcss(),
  ],

  server: {
    host: "0.0.0.0",
    port: 5173,

    proxy: {
      "/auth": {
        target: backendUrl,
        changeOrigin: true,
      },

      "/chatbots": {
        target: backendUrl,
        changeOrigin: true,
      },

      "/chat": {
        target: backendUrl,
        changeOrigin: true,
      },

      "/knowledge-bases": {
        target: backendUrl,
        changeOrigin: true,
      },

      "/conversations": {
        target: backendUrl,
        changeOrigin: true,
      },

      "/health": {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
});
