import { z } from "zod";
import { log } from "../common/logger";
import { fetchParameters } from "../common/parameters";

const parameterMap = {
  DATABASE_URL: "/database/connection_string",
};

/**
 * Optional parameters: when they can't be fetched (e.g. not created or not
 * granted to this function yet), deleteUnusedUploads skips itself instead of
 * failing the whole midnight run.
 */
const s3ParameterMap = {
  S3_ACCOUNT_ID: "/s3/account_id",
  S3_ACCESS_KEY_ID: "/s3/access_key_id",
  S3_SECRET_ACCESS_KEY: "/s3/secret_access_key",
  S3_BUCKET_NAME: "/s3/bucket_name",
};

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DATABASE_URL: z
    .url()
    .default("postgresql://postgres:admin@localhost:5432/db"),
  AWS_EVENT_BUS_ARN: z.string().nullish(),
  S3_ACCOUNT_ID: z.string().nullish(),
  S3_ACCESS_KEY_ID: z.string().nullish(),
  S3_SECRET_ACCESS_KEY: z.string().nullish(),
  S3_BUCKET_NAME: z.string().nullish(),
});

const setup = async () => {
  const parameters = await fetchParameters(parameterMap);

  let s3Parameters: Partial<typeof s3ParameterMap> = {};
  try {
    s3Parameters = await fetchParameters(s3ParameterMap);
  } catch {
    log.warn(
      "Failed to fetch the S3 parameters, deleteUnusedUploads will be skipped",
    );
  }

  // Also mutated into process.env because the database package reads its
  // configuration from there.
  process.env = {
    ...process.env,
    ...parameters,
    ...s3Parameters,
  };

  return environmentSchema.parse(process.env);
};

/**
 * Validated environment. Importing it guarantees the SSM parameters were
 * fetched and validated first (top-level await).
 */
export const env = await setup();
