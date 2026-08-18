import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    /** Mirrors the `@/*` path alias from tsconfig.json, which Next.js resolves itself. */
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    coverage: {
      reporter: [
        "text", // For the terminal
      ],
    },
  },
});
