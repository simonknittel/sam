import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// CI and Docker have no .env file
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
