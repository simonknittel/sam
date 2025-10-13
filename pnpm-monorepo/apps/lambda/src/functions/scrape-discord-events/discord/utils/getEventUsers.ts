import { setTimeout } from "node:timers/promises";
import { z } from "zod";
import { checkResponseForError } from "./checkResponseForError";
import { memberSchema, userSchema } from "./schemas";
import { log } from "../../../../common/logger";
import { env } from "../../env";

export const getEventUsers = async (discordId: string) => {
	let response;

	for (let attempt = 0; attempt < 5; attempt++) {
		response = await fetch(
			`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/scheduled-events/${discordId}/users?with_member=true`,
			{
				headers: new Headers({
					Authorization: `Bot ${env.DISCORD_TOKEN}`,
				}),
			},
		);
		if (response.status !== 429) break;
		const retryAfterHeader = response.headers.get("Retry-After");
		const retryAfterSeconds = retryAfterHeader
			? Number.parseInt(retryAfterHeader, 10) + 1
			: 1;
		void log.warn("Hit rate limit of Discord", {
			endpoint: "getEventUsers",
			retryAfter: retryAfterSeconds,
			attempt,
		});
		await setTimeout(retryAfterSeconds * 1000);
	}
	if (!response) throw new Error("Failed to fetch");

	const body: unknown = await response.json();
	const data = schema.parse(body);

	checkResponseForError(data);

	return data as z.infer<typeof successSchema>;
};

const successSchema = z.array(
	z.object({
		user_id: z.string(),
		user: userSchema,
		member: memberSchema,
	}),
);

const errorSchema = z.object({
	message: z.string(),
});

const schema = z.union([successSchema, errorSchema]);
