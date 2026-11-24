import {
  WikiPageLinkKey,
  getWikiPageLinkSettingKey,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { requireLiveWikiPages, writeWikiSetting } from "./wikiSettings.js";

export const updateWikiPageLinkInputSchema = z.object({
  key: z.enum(WikiPageLinkKey),
  /** Null removes the link */
  page_id: idSchema.nullable(),
});

export type UpdateWikiPageLinkInput = z.infer<
  typeof updateWikiPageLinkInputSchema
>;

export interface UpdateWikiPageLinkOutput {
  readonly key: WikiPageLinkKey;
  readonly page_id: string | null;
}

/** A page link is for example the support link of the top bar */
export const updateWikiPageLink = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateWikiPageLinkInput,
): Promise<UpdateWikiPageLinkOutput> =>
  withSpan(context, "updateWikiPageLink", async () => {
    requirePermission(actor, "wiki", "manage");
    if (input.page_id) await requireLiveWikiPages(context, [input.page_id]);

    await writeWikiSetting(context, actor, {
      key: getWikiPageLinkSettingKey(input.key),
      value: input.page_id,
    });

    return { key: input.key, page_id: input.page_id };
  });
