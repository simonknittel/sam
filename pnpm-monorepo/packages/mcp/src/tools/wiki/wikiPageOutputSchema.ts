import * as z from "zod";
import { dateTimeOutputSchema } from "../../schemas.js";

const wikiPageReferenceSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  path: z.string(),
});

export const wikiPageOutputSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  path: z.string(),
  icon_id: z.string().nullable(),
  parent_id: z.string().nullable(),
  event_id: z.string().nullable(),
  tags: z.array(z.strictObject({ id: z.string(), name: z.string() })),
  linked_pages: z.array(wikiPageReferenceSchema),
  created_at: dateTimeOutputSchema,
  updated_at: dateTimeOutputSchema,
  markdown: z.string(),
  can_add_children: z
    .boolean()
    .describe(
      "Whether the user can add a page below this page with create_wiki_page.",
    ),
});
