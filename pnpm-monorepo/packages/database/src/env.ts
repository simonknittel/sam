import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .union([
      z.literal("development"),
      z.literal("test"),
      z.literal("production"),
    ])
    .default("development"),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:admin@localhost:5432/db"),
});

export const env =
  process.env.SKIP_VALIDATION === "1"
    ? ({ ...process.env } as unknown as z.infer<typeof schema>)
    : schema.parse(process.env);
