import { z } from "zod";

const schema = z.object({
	NODE_ENV: z.enum(["development", "production"]).default("development"),
	DATABASE_URL: z
		.string()
		.url()
		.default("postgresql://postgres:admin@localhost:5432/db"),
});

export const env = schema.parse(process.env);
