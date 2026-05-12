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

export const setup = async () => {
  const parameters = await fetchParameters(parameterMap);

  process.env = {
    ...process.env,
    ...parameters,
  };

  environmentSchema.parse(process.env);
};

await setup();
