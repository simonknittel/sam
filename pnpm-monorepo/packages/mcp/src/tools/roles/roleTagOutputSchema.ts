import * as z from "zod";

/** A tag in `list_role_tags` and after a write of a tag */
export const roleTagOutputSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().describe("Plain text."),
  icon_url: z.url().nullable(),
  role_ids: z
    .array(z.string())
    .describe(
      "The roles of the tag that the user can see, sorted by name. Use them with get_role.",
    ),
});
