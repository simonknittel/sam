import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .union([
      z.literal("development"),
      z.literal("test"),
      z.literal("production"),
    ])
    .default("development"),
  PORT: z.coerce.number().default(5210),
  /**
   * Shared secret with the Next.js app, which mints short-lived JWTs for
   * every collab connection. No default on purpose: a deployment that
   * forgets it must fail at startup instead of accepting tokens signed
   * with a publicly known constant.
   */
  COLLAB_JWT_SECRET: z.string().min(1),
});

export const env = schema.parse(process.env);
