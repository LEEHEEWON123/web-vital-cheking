import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { webVitalKitVitePlugin } from "./web-vital-kit/vite-plugin.mjs";

export default defineConfig({
  plugins: [vue(), webVitalKitVitePlugin({ framework: "vue" })],
});
