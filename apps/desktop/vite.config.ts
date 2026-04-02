import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
