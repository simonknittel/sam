import type { EVENT_PAGE_RELATIONS_SELECT } from "@sam-monorepo/application";
import type { Prisma } from "@sam-monorepo/database/client";

/**
 * The cover image of the event cards of `EventClient`, derived from
 * `EVENT_PAGE_RELATIONS_SELECT` of the application package, thus the prop
 * type and the query cannot drift apart
 */
export type EventCoverImage = Prisma.UploadGetPayload<{
  select: (typeof EVENT_PAGE_RELATIONS_SELECT)["coverImage"]["select"];
}>;
