import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.integration.test.ts"],
        },
      },
      {
        /**
         * Runs the relay service against a real PostgreSQL with all
         * migrations (see `test/postgres.ts`) and real WebSocket clients. The
         * files share one database, thus they run one after the other.
         */
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts"],
          globalSetup: ["./test/postgres.ts"],
          setupFiles: ["./test/databaseUrl.ts"],
          fileParallelism: false,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
