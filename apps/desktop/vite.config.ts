import { defineConfig } from "vitest/config";
import { searchForWorkspaceRoot } from "vite";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
  },
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
