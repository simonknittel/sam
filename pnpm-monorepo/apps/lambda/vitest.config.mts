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
         * Runs the jobs against a real PostgreSQL with all migrations (see
         * `test/postgres.ts`). The files share one database, thus they run
         * one after the other.
         */
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts"],
          globalSetup: ["./test/postgres.ts"],
          setupFiles: ["./test/databaseUrl.ts"],
          fileParallelism: false,
          hookTimeout: 120_000,
          env: {
            // Same as the deployed functions (see the Terraform module)
            TZ: "Europe/Berlin",
            // Keeps AWS X-Ray quiet without a trace context
            ENVIRONMENT: "local",
          },
        },
      },
    ],
  },
});
