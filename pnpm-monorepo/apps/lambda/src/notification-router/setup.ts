import { z } from "zod";
import { fetchParameters } from "../common/parameters";

const parameterMap = {
  DATABASE_URL: "/database/connection_string",
  PUBLIC_VAPID_KEY: "/web_push/public_vapid_key",
  PRIVATE_VAPID_KEY: "/web_push/private_vapid_key",
};

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DATABASE_URL: z
    .url()
    .default("postgresql://postgres:admin@localhost:5432/db"),
  BASE_URL: z.url().default("http://localhost:3000"),
  PUBLIC_VAPID_KEY: z.string(),
  PRIVATE_VAPID_KEY: z.string(),
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
