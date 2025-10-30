import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DATABASE_URL: z
    .url()
    .default("postgresql://postgres:admin@localhost:5432/db"),
  BASE_URL: z.string().url().default("http://localhost:3000"),
  NOVU_SECRET_KEY: z.string().optional(),
  NOVU_SERVER_URL: z.url().optional().default("https://eu.api.novu.co"),
  PUSHER_BEAMS_INSTANCE_ID: z.string().optional(),
  PUSHER_BEAMS_KEY: z.string().optional(),
});

export const env = schema.parse(process.env);
