import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GITHUB_PAGES=true -> build for https://<user>.github.io/smart-farmer-portal/
// VITE_API_URL      -> address of the deployed backend (e.g. https://smart-farmer-portal.onrender.com)
const pages = process.env.GITHUB_PAGES === "true";
const apiUrl = (process.env.VITE_API_URL || "").replace(/\/$/, "");

export default defineConfig({
  plugins: [react()],
  base: pages ? "/smart-farmer-portal/" : "/",
  define: {
    __API_URL__: JSON.stringify(apiUrl),
    // Demo mode only if we are on GitHub Pages AND no backend address was given.
    __DEMO_MODE__: JSON.stringify(pages && !apiUrl),
  },
  // During development, requests to /api go to the backend on port 5000.
  server: { proxy: { "/api": "http://localhost:5000" } },
});
