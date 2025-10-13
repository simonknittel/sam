import { z } from "zod";

export const userSchema = z.object({
	id: z.string(),
	username: z.string(),
	global_name: z.string().optional().nullable(),
	avatar: z.string().optional().nullable(),
});

export const memberSchema = z.object({
	nick: z.string().optional().nullable(),
	avatar: z.string().optional().nullable(),
});

export const eventSchema = z.object({
	id: z.string(),
	guild_id: z.string(),
	name: z.string(),
	image: z.string().optional().nullable(),
	scheduled_start_time: z.coerce.date(),
	scheduled_end_time: z.coerce.date().nullable(),
	user_count: z.number(),
	description: z.string().optional(),
	creator_id: z.string(),
	creator: userSchema,
	entity_metadata: z.object({
		location: z.string().optional(),
	}),
});
