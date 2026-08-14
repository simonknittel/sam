import { z } from "zod";
import { fetchParameters } from "../common/parameters";

const parameterMap = {
  DATABASE_URL: "/database/connection_string",
  DISCORD_BOT_TOKEN: "/discord/bot_token",
};

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DATABASE_URL: z
    .url()
    .default("postgresql://postgres:admin@localhost:5432/db"),
  DISCORD_GUILD_ID: z.string(),
  DISCORD_BOT_TOKEN: z.string(),
  AWS_EVENT_BUS_ARN: z.string().nullish(),
});

const setup = async () => {
  const parameters = await fetchParameters(parameterMap);

  // Also mutated into process.env because the database package reads its
  // configuration from there.
  process.env = {
    ...process.env,
    ...parameters,
  };

  return environmentSchema.parse(process.env);
};

/**
 * Validated environment. Importing it guarantees the SSM parameters were
 * fetched and validated first (top-level await).
 */
export const env = await setup();
