import { z } from "zod";

const schema = z.object({
	COMMIT_SHA: z.string().optional(),
	NODE_ENV: z.enum(["development", "production"]).default("development"),
	DATABASE_URL: z
		.string()
		.url()
		.default("postgresql://postgres:admin@localhost:5432/db"),
});

export const env = schema.parse(process.env);
