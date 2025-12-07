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

export const setup = async () => {
  const parameters = await fetchParameters(parameterMap);

  process.env = {
    ...process.env,
    ...parameters,
  };

  environmentSchema.parse(process.env);
};

await setup();
