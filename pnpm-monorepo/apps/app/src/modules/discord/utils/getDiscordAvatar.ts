import { env } from "@/env";
import type { DiscordProfile } from "next-auth/providers/discord";
import { type z } from "zod";
import type { guildMemberResponseSchema } from "./schemas";

export const getDiscordAvatar = (
  profile: DiscordProfile,
  guildMember: z.infer<typeof guildMemberResponseSchema>,
) => {
  if (guildMember && "avatar" in guildMember && guildMember.avatar) {
    const format = getFormat(guildMember.avatar);
    return `https://cdn.discordapp.com/guilds/${env.DISCORD_GUILD_ID}/users/${profile.id}/avatars/${guildMember.avatar}.${format}`;
  } else if (profile.avatar) {
    const format = getFormat(profile.avatar);
    return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
  }

  const defaultAvatarNumber = (Number.parseInt(profile.id) >> 22) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
};

const getFormat = (avatar: string) =>
  avatar.startsWith("a_") ? "gif" : "webp";
