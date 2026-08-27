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
    /**
     * A unit test has no environment of a deployment, and a module under test
     * can reach `@/env` through an import it does not use itself. A test that
     * needs a value mocks the module (see `resolveEmbedUrl.test.ts`).
     */
    env: {
      SKIP_VALIDATION: "1",
    },
    coverage: {
      reporter: [
        "text", // For the terminal
      ],
    },
  },
});
