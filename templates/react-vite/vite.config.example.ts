import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { webVitalKitVitePlugin } from "./web-vital-kit/vite-plugin.mjs";

export default defineConfig({
  plugins: [react(), webVitalKitVitePlugin({ framework: "react" })],
});
