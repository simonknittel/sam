import { env } from "@/env";
import { guildMemberResponseSchema } from "./schemas";

export const getGuildMember = async (access_token: string) => {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${access_token}`);

  const response = await fetch(
    `https://discord.com/api/v10/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`,
    {
      headers,
      next: {
        revalidate: 0,
      },
    },
  );

  const body: unknown = await response.json();
  const data = guildMemberResponseSchema.parse(body);

  return data;
};
