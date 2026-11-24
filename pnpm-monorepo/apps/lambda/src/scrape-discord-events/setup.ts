import * as z from "zod";
import { applicationContextEnvironmentShape } from "../common/applicationContextEnvironment";
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
  /** With its path, without a trailing slash */
  DISCORD_API_BASE_URL: z.url().default("https://discord.com/api/v10"),
  AWS_EVENT_BUS_ARN: z.string().nullish(),
  ...applicationContextEnvironmentShape,
});

const setup = async () => {
  const parameters = await fetchParameters(parameterMap);

  // The database package reads its configuration from `process.env`
  process.env = {
    ...process.env,
    ...parameters,
  };

  return environmentSchema.parse(process.env);
};

export const env = await setup();
