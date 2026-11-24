// The browser-safe entry keeps the Prisma runtime (and its Node builtins)
// out of client bundles — domain is imported from client components too.
import {
  WikiPageEventScope,
  WikiPageNamespace,
  WikiPageUploadability,
} from "@sam-monorepo/database/browser";

/**
 * The locked root page of a briefing (see `isEventWikiRootPage()`). The
 * MANAGERS scopes keep the tab hidden until the organizer deliberately
 * publishes it.
 */
export const buildBriefingRootPageSeed = (ownerId: string | null) => ({
  namespace: WikiPageNamespace.EVENT,
  title: "BRIEFING",
  slug: "briefing",
  eventReadScope: WikiPageEventScope.MANAGERS,
  eventEditScope: WikiPageEventScope.MANAGERS,
  imageUploadability: WikiPageUploadability.RESTRICTED,
  attachmentUploadability: WikiPageUploadability.RESTRICTED,
  ownerId,
});
