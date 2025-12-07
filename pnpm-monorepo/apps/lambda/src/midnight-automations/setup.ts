import { z } from "zod";
import { fetchParameters } from "../common/parameters";

const parameterMap = {
  DATABASE_URL: "/database/connection_string",
};

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DATABASE_URL: z
    .url()
    .default("postgresql://postgres:admin@localhost:5432/db"),
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
