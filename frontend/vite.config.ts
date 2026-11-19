import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(),
    tailwindcss(),
  ],

  server: {
    host: "0.0.0.0",
    port: 5173,

    proxy: {
      "/auth": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },

      "/chatbots": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },

      "/chat": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },

      "/knowledge-bases": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },

      "/conversations": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },

      "/health": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
