import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "../../packages/app-core/src"),
      "@ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@features": path.resolve(__dirname, "../../packages/features"),
      "@services": path.resolve(__dirname, "../../packages/services"),
      "@types": path.resolve(__dirname, "../../packages/types"),
      "@config": path.resolve(__dirname, "../../packages/config")
    }
  }
});

