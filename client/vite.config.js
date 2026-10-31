import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GITHUB_PAGES=true -> build the static demo for https://<user>.github.io/smart-farmer-portal/
const pages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  plugins: [react()],
  base: pages ? "/smart-farmer-portal/" : "/",
  define: { __DEMO_MODE__: JSON.stringify(pages) },
  // During development, requests to /api go to the backend on port 5000.
  server: { proxy: { "/api": "http://localhost:5000" } },
});
