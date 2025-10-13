import { z } from "zod";

const schema = z.object({
	NODE_ENV: z.enum(["development", "production"]).default("development"),
	DATABASE_URL: z
		.string()
		.url()
		.default("postgresql://postgres:admin@localhost:5432/db"),
	BASE_URL: z.string().url().default("http://localhost:3000"),
	PUSHER_BEAMS_INSTANCE_ID: z.string().optional(),
	PUSHER_BEAMS_KEY: z.string().optional(),
	DISCORD_GUILD_ID: z.string(),
	DISCORD_TOKEN: z.string(),
});

export const env = schema.parse(process.env);
