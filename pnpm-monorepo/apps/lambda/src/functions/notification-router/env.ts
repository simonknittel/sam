import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DATABASE_URL: z
    .url()
    .default("postgresql://postgres:admin@localhost:5432/db"),
  BASE_URL: z.url().default("http://localhost:3000"),
  PUBLIC_VAPID_KEY: z.string(),
  PRIVATE_VAPID_KEY: z.string(),
});

export const env = schema.parse(process.env);
