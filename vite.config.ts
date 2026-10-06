import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { brochuresPlugin, reviewPlugin } from "./vite-plugin-review.ts";

export default defineConfig({
  plugins: [react(), tailwindcss(), brochuresPlugin(), reviewPlugin()],
  test: {
    environment: "node",
  },
});
