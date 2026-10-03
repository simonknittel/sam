import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// process.loadEnvFile() throws an error when the file does not exist (for
// example in CI and in Docker). It does not replace variables that are set.
if (existsSync(".env")) process.loadEnvFile();

export default defineConfig({
  schema: "prisma/",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
