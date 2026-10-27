import { UserRoleOutput } from "@sam-monorepo/application";
import * as z from "zod";
import { citizenReferenceSchema, dateTimeOutputSchema } from "../../schemas.js";

/** The fields of a user in `list_users` and in `get_user` */
export const userOutputShape = {
  id: z.string(),
  name: z.string().nullable().describe("The name from Discord."),
  email: z
    .string()
    .nullable()
    .describe(
      "The email address, redacted: only the first and the last character of the local part and of the domain name, and the top-level domain, for example h***o@e***e.com. Use it to compare the address with a known address. Do not guess the full address.",
    ),
  email_verified_at: dateTimeOutputSchema
    .nullable()
    .describe("When the user confirmed the email address, or null."),
  created_at: dateTimeOutputSchema.nullable(),
  role: z
    .enum(UserRoleOutput)
    .describe("admin: an admin of SAM. user: all other users."),
  discord_id: z.string().nullable(),
  discord_two_factor_enabled: z
    .boolean()
    .nullable()
    .describe(
      "The two-factor authentication of the last Discord login. Null: unknown.",
    ),
  citizen: citizenReferenceSchema
    .nullable()
    .describe(
      "The citizen of the user. Null for a user without a citizen or with a deleted citizen.",
    ),
  ban: z
    .strictObject({
      banned_at: dateTimeOutputSchema,
      reason: z.string().nullable(),
      banned_by: citizenReferenceSchema
        .nullable()
        .describe("Null for a ban without a citizen or by a deleted citizen."),
    })
    .nullable()
    .describe("Null for a user who is not banned."),
};
