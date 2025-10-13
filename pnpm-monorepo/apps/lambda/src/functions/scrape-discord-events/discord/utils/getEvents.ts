import { z } from "zod";
import { env } from "../../env";
import { checkResponseForError } from "./checkResponseForError";
import { eventSchema } from "./schemas";

export const getEvents = async () => {
	// https://discord.com/developers/docs/resources/guild-scheduled-event#list-scheduled-events-for-guild
	const response = await fetch(
		`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/scheduled-events?with_user_count=true`,
		{
			headers: new Headers({
				Authorization: `Bot ${env.DISCORD_TOKEN}`,
			}),
		},
	);

	const body: unknown = await response.json();
	const data = responseSchema.parse(body);

	checkResponseForError(data);

	return {
		date: response.headers.get("Date"),
		data: data as z.infer<typeof successSchema>,
	};
};

const successSchema = z.array(eventSchema);

const errorSchema = z.object({
	message: z.string(),
});

const responseSchema = z.union([successSchema, errorSchema]);
