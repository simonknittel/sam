import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { WikiPageAccessTier } from "./getAccessibleWikiPage.js";
import { requireWikiPageOfScope } from "./wikiScope.js";

export const updateWikiPageFavoriteInputSchema = z.object({
  page_id: idSchema,
  is_favorite: z
    .boolean()
    .describe("The new state: true saves the page, false removes it."),
});

export type UpdateWikiPageFavoriteInput = z.output<
  typeof updateWikiPageFavoriteInputSchema
>;

export interface UpdateWikiPageFavoriteOutput {
  readonly page_id: string;
  readonly is_favorite: boolean;
  /** False when the page was in the requested state already */
  readonly changed: boolean;
}

/**
 * Sets the state that the button showed as the new state, not the opposite of
 * the stored state: a different tab can have changed the state before. Works
 * in a briefing that is over, because a favorite is personal data.
 */
export const updateWikiPageFavorite = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateWikiPageFavoriteInput,
): Promise<UpdateWikiPageFavoriteOutput> =>
  withSpan(context, "updateWikiPageFavorite", async () => {
    const citizenId = requireCitizen(actor).id;

    const { page } = await requireWikiPageOfScope(
      context,
      actor,
      input.page_id,
      WikiPageAccessTier.Read,
    );

    /**
     * No change when the page is already in the requested state: the writes
     * do not fail, and the count tells if they changed something
     */
    const { count } = input.is_favorite
      ? await context.prisma.wikiPageFavorite.createMany({
          data: [{ citizenId, pageId: page.id }],
          skipDuplicates: true,
        })
      : await context.prisma.wikiPageFavorite.deleteMany({
          where: { citizenId, pageId: page.id },
        });

    if (count > 0)
      await context.audit.create([
        {
          type: input.is_favorite
            ? AuditEventType.WIKI_PAGE_FAVORITE_ADDED
            : AuditEventType.WIKI_PAGE_FAVORITE_REMOVED,
          data: {
            pageId: page.id,
            eventId: page.eventId ?? undefined,
            citizenId,
          },
          createdById: actor.userId,
        },
      ]);

    return {
      page_id: page.id,
      is_favorite: input.is_favorite,
      changed: count > 0,
    };
  });
