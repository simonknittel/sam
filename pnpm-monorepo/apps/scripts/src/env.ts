import { z } from "zod";

/**
 * Only imported by the scripts that actually need these variables, so a
 * script without environment requirements keeps running without them.
 * Validation fails at startup with a clear message instead of an
 * authentication error halfway through a run.
 */
const schema = z.object({
  ALGOLIA_APP_ID: z.string().min(1),
  ALGOLIA_ADMIN_API_KEY: z.string().min(1),
});

export const env = schema.parse(process.env);
