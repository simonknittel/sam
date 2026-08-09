import { z } from "zod";
import { fetchOptionalParameters, fetchParameters } from "../common/parameters";

const parameterMap = {
  DATABASE_URL: "/database/connection_string",
  PUBLIC_VAPID_KEY: "/web_push/public_vapid_key",
  PRIVATE_VAPID_KEY: "/web_push/private_vapid_key",
};

/**
 * Soketi connection for realtime on-site notifications. Optional: without
 * them realtime events are skipped and clients read new notifications from
 * the database on their next page load.
 */
const optionalParameterMap = {
  PUSHER_CHANNELS_APP_ID: "/soketi/app_id",
  PUSHER_CHANNELS_APP_KEY: "/soketi/app_key",
  PUSHER_CHANNELS_APP_SECRET: "/soketi/app_secret",
  PUSHER_CHANNELS_HOST: "/soketi/host",
  PUSHER_CHANNELS_PORT: "/soketi/port",
  PUSHER_CHANNELS_SECURE_PORT: "/soketi/secure_port",
};

/**
 * Terraform creates the parameters with this value and never touches them
 * again (values are populated manually via the AWS Console, see
 * terraform/parameters.tf). A parameter still holding it counts as unset.
 */
const PLACEHOLDER_PARAMETER_VALUE = "PLACEHOLDER";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DATABASE_URL: z
    .url()
    .default("postgresql://postgres:admin@localhost:5432/db"),
  BASE_URL: z.url().default("http://localhost:3000"),
  PUBLIC_VAPID_KEY: z.string(),
  PRIVATE_VAPID_KEY: z.string(),
  /**
   * Soketi connection for realtime on-site notifications. Optional: without
   * them realtime events are skipped and clients read new notifications from
   * the database on their next page load.
   */
  PUSHER_CHANNELS_APP_ID: z.string().optional(),
  PUSHER_CHANNELS_APP_KEY: z.string().optional(),
  PUSHER_CHANNELS_APP_SECRET: z.string().optional(),
  PUSHER_CHANNELS_HOST: z.string().optional(),
  PUSHER_CHANNELS_PORT: z.string().optional(),
  PUSHER_CHANNELS_SECURE_PORT: z.string().optional(),
});

export const setup = async () => {
  const [parameters, optionalParameters] = await Promise.all([
    fetchParameters(parameterMap),
    fetchOptionalParameters(optionalParameterMap),
  ]);

  const configuredOptionalParameters = Object.fromEntries(
    Object.entries(optionalParameters).filter(
      ([, value]) => value !== PLACEHOLDER_PARAMETER_VALUE,
    ),
  );

  process.env = {
    ...process.env,
    ...parameters,
    ...configuredOptionalParameters,
  };

  environmentSchema.parse(process.env);
};

await setup();
