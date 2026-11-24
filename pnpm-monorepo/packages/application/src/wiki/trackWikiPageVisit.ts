import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { WikiPageAccessTier } from "./getAccessibleWikiPage.js";
import { requireWikiPageOfScope } from "./wikiScope.js";

const WIKI_VISIT_THROTTLE_MILLISECONDS = 60 * 60 * 1000;

export const trackWikiPageVisitInputSchema = z.object({
  page_id: idSchema,
});

export type TrackWikiPageVisitInput = z.output<
  typeof trackWikiPageVisitInputSchema
>;

export interface TrackWikiPageVisitOutput {
  readonly page_id: string;
  /** False when the throttle skipped the visit */
  readonly recorded: boolean;
}

/**
 * The app calls it from the browser after the page shows, not during the
 * render on the server: a prefetch renders pages that the user never opens,
 * and a navigation from the prefetch cache renders nothing. The audit event
 * has the same throttle, thus it counts sessions, not requests. The use case
 * also works in a briefing that is over, because a visit is personal data.
 */
export const trackWikiPageVisit = (
  context: ApplicationContext,
  actor: Actor,
  input: TrackWikiPageVisitInput,
): Promise<TrackWikiPageVisitOutput> =>
  withSpan(context, "trackWikiPageVisit", async () => {
    const citizenId = requireCitizen(actor).id;
    const now = context.now();

    /**
     * The throttle reads only the rows of the actor, thus it runs before the
     * permission check: a visit again in the same hour does not load the
     * scope
     */
    const existing = await context.prisma.wikiPageVisit.findUnique({
      where: { citizenId_pageId: { citizenId, pageId: input.page_id } },
      select: { lastVisitedAt: true },
    });
    if (
      existing &&
      existing.lastVisitedAt.getTime() >
        now.getTime() - WIKI_VISIT_THROTTLE_MILLISECONDS
    )
      return { page_id: input.page_id, recorded: false };

    const { page } = await requireWikiPageOfScope(
      context,
      actor,
      input.page_id,
      WikiPageAccessTier.Read,
    );

    await context.prisma.wikiPageVisit.upsert({
      where: { citizenId_pageId: { citizenId, pageId: page.id } },
      create: { citizenId, pageId: page.id, lastVisitedAt: now },
      update: { lastVisitedAt: now },
    });

    await context.audit.create([
      {
        type: AuditEventType.WIKI_PAGE_VISITED,
        data: { pageId: page.id, citizenId },
        createdById: actor.userId,
      },
    ]);

    return { page_id: page.id, recorded: true };
  });
