import type { WikiPage } from "@sam-monorepo/database/client";

/**
 * The seeded top-level "Briefing" page of a briefing — an event's or an
 * event template's. It is the briefing's homepage and gate and therefore
 * locked: it can never be renamed, moved, deleted or given siblings, and
 * its scopes may not be INHERIT. Every other page of the container lives
 * below it, so losing it would take the whole briefing with it.
 */
export const isEventWikiRootPage = (
  page: Pick<WikiPage, "eventId" | "templateId" | "parentId">,
) =>
  (page.eventId !== null || page.templateId !== null) && page.parentId === null;
