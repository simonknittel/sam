import type { EVENT_PAGE_RELATIONS_SELECT } from "@sam-monorepo/application";
import type { Prisma } from "@sam-monorepo/database/client";

export type EventCoverImage = Prisma.UploadGetPayload<{
  select: (typeof EVENT_PAGE_RELATIONS_SELECT)["coverImage"]["select"];
}>;
