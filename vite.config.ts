/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base MUST equal "/<repo-name>/" or GitHub Pages serves a blank page.
export default defineConfig({
  base: "/strongman-rebuild/",
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
