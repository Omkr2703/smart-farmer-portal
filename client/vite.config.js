import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During development, requests to /api go to the backend on port 5000.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:5000" } },
});
