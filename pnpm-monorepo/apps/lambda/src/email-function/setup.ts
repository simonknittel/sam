import { z } from "zod";
import { fetchParameters } from "../common/parameters";

const parameterMap = {
  MAILGUN_API_KEY: "/mailgun/api_key",
};

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  MAILGUN_API_KEY: z.string(),
  BASE_URL: z.url().default("http://localhost:3000"),
});

const setup = async () => {
  const parameters = await fetchParameters(parameterMap);

  // Also mutated into process.env because libraries read their
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
