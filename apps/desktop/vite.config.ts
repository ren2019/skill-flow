import { defineConfig } from "vitest/config";
import { searchForWorkspaceRoot } from "vite";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts", "src/tests/**/*.test.tsx"],
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
