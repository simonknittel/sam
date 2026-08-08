import type { WikiPage } from "@sam-monorepo/database/client";

/**
 * The seeded top-level "Briefing" page of an event wiki. It is the wiki's
 * homepage and gate and therefore locked: it can never be renamed, moved,
 * deleted or given siblings — every other page of the event lives below it.
 */
export const isEventWikiRootPage = (
  page: Pick<WikiPage, "eventId" | "parentId">,
) => page.eventId !== null && page.parentId === null;
