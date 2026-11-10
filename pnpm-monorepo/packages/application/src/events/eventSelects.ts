import type { Prisma } from "@sam-monorepo/database/client";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";

/*
 * Event pages serialize these shapes into the browser, so a full Citizen or
 * Upload row here would ship a citizen's Discord id, Teamspeak id and SILC
 * balances with every event.
 */

/** A cover image as `getPublicUploadUrl()` and `next/image` need it */
const EVENT_COVER_IMAGE_SELECT = {
  id: true,
  mimeType: true,
} as const satisfies Prisma.UploadSelect;

/** The participation columns the event surfaces read */
const EVENT_PARTICIPANT_SELECT = {
  id: true,
  citizenId: true,
  discordUserId: true,
  comment: true,
  createdAt: true,
} as const satisfies Prisma.EventParticipantSelect;

/**
 * Spread into every query that loads an event for a page: the active
 * participants, the managers and the cover image.
 */
export const EVENT_PAGE_RELATIONS_SELECT = {
  participants: {
    where: { cancelledAt: null },
    select: EVENT_PARTICIPANT_SELECT,
  },
  managers: { select: CITIZEN_REFERENCE_SELECT },
  coverImage: { select: EVENT_COVER_IMAGE_SELECT },
} as const satisfies Prisma.EventSelect;

/**
 * One event with everything its layout and its subpages share, and with the
 * fields of `getEvent()` and of the visibility and manage rules. The position
 * tree is deliberately not part of it: only the lineup renders it.
 */
export const EVENT_DETAILS_SELECT = {
  id: true,
  source: true,
  name: true,
  description: true,
  startTime: true,
  endTime: true,
  location: true,
  visibility: true,
  lineupEnabled: true,
  participationEnabled: true,
  createdAt: true,
  createdById: true,
  deletedAt: true,
  discordId: true,
  discordCreatorId: true,
  discordGuildId: true,
  discordImage: true,
  discordPublishedId: true,
  discordPublishedAt: true,
  discordPublishedChannelId: true,
  discordPublishedLocation: true,
  ...EVENT_PAGE_RELATIONS_SELECT,
  visibilityRoles: { select: { roleId: true } },
  createdBy: { select: CITIZEN_REFERENCE_SELECT },
} as const satisfies Prisma.EventSelect;

export type EventDetails = Prisma.EventGetPayload<{
  select: typeof EVENT_DETAILS_SELECT;
}>;
