import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import vercel from 'vite-plugin-vercel';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    vercel(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
