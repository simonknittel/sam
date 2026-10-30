import {
  CalendarEntryType,
  getLocalDate,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";
import { requireCitizen } from "../actor.js";
import type {
  CalendarEntryCollector,
  PenaltyExpiryCalendarEntry,
} from "./calendarEntry.js";

/**
 * The expiry of the penalty entries of the citizen of the actor that are not
 * deleted, the same entries that `ownPenaltyEntry;read` opens in the list of
 * the penalty entries
 */
export const penaltyExpiryEntryCollector: CalendarEntryCollector<PenaltyExpiryCalendarEntry> =
  {
    canRead: (actor) =>
      actor.citizen !== null && actor.authorize("ownPenaltyEntry", "read"),
    collect: async (context, actor, { from, until }) => {
      const citizenId = requireCitizen(actor).id;

      const penaltyEntries = await context.prisma.penaltyEntry.findMany({
        where: {
          citizenId,
          deletedAt: null,
          expiresAt: { gte: from, lt: until },
        },
        select: { id: true, points: true, expiresAt: true },
      });

      /** The penalty points app needs more than the own entries */
      const href = actor.authorize("penaltyEntry", "read")
        ? "/app/penalty-points"
        : null;

      return penaltyEntries.flatMap(({ id, points, expiresAt }) => {
        if (!expiresAt) return [];

        return [
          {
            type: CalendarEntryType.PenaltyExpiry,
            key: `penalty_expiry:${id}`,
            date: getLocalDate(expiresAt, ORGANIZATION_TIMEZONE),
            time: expiresAt,
            href,
            points,
          },
        ];
      });
    },
  };
