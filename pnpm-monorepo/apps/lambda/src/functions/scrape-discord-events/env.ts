import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DATABASE_URL: z
    .url()
    .default("postgresql://postgres:admin@localhost:5432/db"),
  DISCORD_GUILD_ID: z.string(),
  DISCORD_TOKEN: z.string(),
  AWS_EVENT_BUS_ARN: z.string().nullish(),
});

export const env = schema.parse(process.env);
