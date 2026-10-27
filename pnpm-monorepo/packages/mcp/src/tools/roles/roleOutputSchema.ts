import * as z from "zod";

/** The fields of a role in `list_roles` and in `get_role` */
export const roleOutputShape = {
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().describe("Markdown."),
  icon_url: z.url().nullable(),
  max_level: z
    .int()
    .nullable()
    .describe(
      "The number of levels of the role, or null for a role without levels.",
    ),
  inherited_role_ids: z
    .array(z.string())
    .describe(
      "The roles whose permissions this role also gives. Only the roles that the user can see.",
    ),
  tags: z
    .array(z.strictObject({ id: z.string(), name: z.string() }))
    .describe(
      "The tags of the role, sorted by name. A tag groups roles. Use a tag id as the tag_id filter of list_roles.",
    ),
};
