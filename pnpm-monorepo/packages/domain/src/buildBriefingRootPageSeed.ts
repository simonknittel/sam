import {
  WikiPageEventScope,
  WikiPageNamespace,
  WikiPageUploadability,
} from "@sam-monorepo/database/client";

/**
 * Data for an event wiki's locked root "Briefing" page: the wiki's homepage
 * and gate (events without one have no Briefing tab). Title and slug are
 * constants because the root page can never be renamed. MANAGERS scopes keep
 * the tab hidden until the organizer deliberately publishes it. The owner id
 * is passed in by the caller: the app uses the creating citizen, the sync
 * Lambda resolves the Discord creator (null if no citizen matches).
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
