import { MAXIMUM_WIKI_FEATURED_PAGES } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import {
  WIKI_SETTING_FEATURED_PAGES,
  requireLiveWikiPages,
  writeWikiSetting,
} from "./wikiSettings.js";

export const updateWikiFeaturedPagesInputSchema = z.object({
  /** In the sequence of the landing page, without duplicates after the parse */
  page_ids: z
    .array(idSchema)
    .max(MAXIMUM_WIKI_FEATURED_PAGES)
    .transform((values) => [...new Set(values)]),
});

export type UpdateWikiFeaturedPagesInput = z.infer<
  typeof updateWikiFeaturedPagesInputSchema
>;

export interface UpdateWikiFeaturedPagesOutput {
  readonly page_ids: string[];
}

export const updateWikiFeaturedPages = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateWikiFeaturedPagesInput,
): Promise<UpdateWikiFeaturedPagesOutput> =>
  withSpan(context, "updateWikiFeaturedPages", async () => {
    requirePermission(actor, "wiki", "manage");
    await requireLiveWikiPages(context, input.page_ids);

    await writeWikiSetting(context, actor, {
      key: WIKI_SETTING_FEATURED_PAGES,
      value: input.page_ids,
    });

    return { page_ids: input.page_ids };
  });
