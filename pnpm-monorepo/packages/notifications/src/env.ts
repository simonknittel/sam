import { z } from "zod";

const schema = z.object({
  BASE_URL: z.string().url().default("http://localhost:3000"),
  NOVU_SECRET_KEY: z.string().optional(),
  NOVU_SERVER_URL: z
    .string()
    .url()
    .optional()
    .default("https://eu.api.novu.co"),
  PUSHER_BEAMS_INSTANCE_ID: z.string().optional(),
  PUSHER_BEAMS_KEY: z.string().optional(),
});

export const env =
  process.env.SKIP_VALIDATION === "1"
    ? ({ ...process.env } as unknown as z.infer<typeof schema>)
    : schema.parse(process.env);
