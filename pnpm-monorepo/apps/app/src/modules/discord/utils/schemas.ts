import * as z from "zod";

export const guildMemberResponseSchema = z.object({
  avatar: z.string().nullable(),
});

export type GuildMember = z.infer<typeof guildMemberResponseSchema>;
