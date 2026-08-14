import { z } from "zod";

export const guildMemberResponseSchema = z.union([
  z.object({
    avatar: z.string().nullable(),
  }),

  z.object({
    message: z.string(),
  }),
]);
