import { env } from "@/env";
import { guildMemberResponseSchema, type GuildMember } from "./schemas";

/**
 * @returns `null` when the user is not a member of the guild. Throws for all
 * other failures, for example a rate limit or a timeout.
 */
export const getGuildMember = async (
  access_token: string,
): Promise<GuildMember | null> => {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${access_token}`);

  const response = await fetch(
    `${env.DISCORD_API_BASE_URL}/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`,
    {
      headers,
      signal: AbortSignal.timeout(5000),
      next: {
        revalidate: 0,
      },
    },
  );

  // Discord answers "Unknown Guild" when the user is not a member
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`Discord answered with the status ${response.status}`);

  const body: unknown = await response.json();
  return guildMemberResponseSchema.parse(body);
};
