import { EventActivityType } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import { buildCursorConditions, cursorOrderBy } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  toActivityFilterWhere,
  type ActivitySourceInput,
} from "../activitySources.js";
import type { Actor } from "../actor.js";
import {
  CITIZEN_REFERENCE_SELECT,
  type CitizenReferenceRow,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { requireVisibleEvent } from "./findVisibleEvent.js";

/** A citizen as the activity table links it */
export type EventActivityCitizen = CitizenReferenceRow;

/** One page request of the activity source of an event */
export interface EventActivityRowsInput extends ActivitySourceInput {
  readonly eventId: string;
  /** Only these types. Null: all types. */
  readonly types: readonly EventActivityType[] | null;
}

export interface EventActivityRow {
  readonly id: string;
  readonly type: EventActivityType;
  readonly createdAt: Date;
  /** The stored payload. The renderer parses it for each type. */
  readonly payload: Prisma.JsonValue;
  /** Who caused the entry */
  readonly actor: EventActivityCitizen | null;
  /**
   * The citizen that the entry is about: the payload's citizen for the types
   * of `TYPES_WITH_AFFECTED_CITIZEN_IN_PAYLOAD`, the actor for the types of
   * `SELF_APPLIED_TYPES`. Null for all other types, or when the citizen does
   * not exist (anymore).
   */
  readonly affectedCitizen: EventActivityCitizen | null;
}

/**
 * The types whose payload names a citizen other than the row's own actor:
 * the row's citizen column holds the acting manager
 */
const TYPES_WITH_AFFECTED_CITIZEN_IN_PAYLOAD: ReadonlySet<EventActivityType> =
  new Set([
    EventActivityType.PARTICIPATION_ADDED_BY_MANAGER,
    EventActivityType.PARTICIPATION_REMOVED_BY_MANAGER,
    EventActivityType.MANAGER_ADDED,
    EventActivityType.MANAGER_REMOVED,
  ]);

/** The types where the actor changes their own participation */
const SELF_APPLIED_TYPES: ReadonlySet<EventActivityType> = new Set([
  EventActivityType.PARTICIPATION_SIGNED_UP,
  EventActivityType.PARTICIPATION_COMMENT_UPDATED,
  EventActivityType.PARTICIPATION_CANCELLED,
]);

const affectedCitizenPayloadSchema = z.object({ citizenId: z.string() });

const getAffectedCitizenId = (activity: {
  readonly type: EventActivityType;
  readonly payload: Prisma.JsonValue;
}): string | null =>
  TYPES_WITH_AFFECTED_CITIZEN_IN_PAYLOAD.has(activity.type)
    ? (affectedCitizenPayloadSchema.safeParse(activity.payload).data
        ?.citizenId ?? null)
    : null;

/**
 * One page of the stored activity of an event that the actor can see. The
 * activity is visible to everyone who can see the event.
 *
 * @throws ForbiddenError without `event;read`, NotFoundError when the actor
 * cannot see the event
 */
export const findEventActivityRows = async (
  context: ApplicationContext,
  actor: Actor,
  input: EventActivityRowsInput,
): Promise<EventActivityRow[]> => {
  const { eventId, sourceKey, types, position, direction, take } = input;
  const event = await requireVisibleEvent(context, actor, eventId);

  const activities = await context.prisma.eventActivity.findMany({
    where: {
      AND: [
        {
          eventId: event.id,
          ...(types ? { type: { in: [...types] } } : {}),
          ...toActivityFilterWhere(input, "citizenId"),
        },
        ...buildCursorConditions(position, sourceKey, direction, "createdAt"),
      ],
    },
    orderBy: cursorOrderBy(direction, "createdAt"),
    take,
    select: {
      id: true,
      type: true,
      createdAt: true,
      payload: true,
      citizen: { select: CITIZEN_REFERENCE_SELECT },
    },
  });

  const affectedCitizenIds = activities
    .map(getAffectedCitizenId)
    .filter((citizenId) => citizenId !== null);
  const affectedCitizens =
    affectedCitizenIds.length > 0
      ? await context.prisma.citizen.findMany({
          where: { id: { in: affectedCitizenIds } },
          select: CITIZEN_REFERENCE_SELECT,
        })
      : [];
  const affectedCitizenById = new Map(
    affectedCitizens.map((citizen) => [citizen.id, citizen]),
  );

  const getAffectedCitizen = (
    activity: (typeof activities)[number],
  ): EventActivityCitizen | null => {
    if (SELF_APPLIED_TYPES.has(activity.type)) return activity.citizen;

    const affectedCitizenId = getAffectedCitizenId(activity);
    return affectedCitizenId
      ? (affectedCitizenById.get(affectedCitizenId) ?? null)
      : null;
  };

  return activities.map((activity) => ({
    id: activity.id,
    type: activity.type,
    createdAt: activity.createdAt,
    payload: activity.payload,
    actor: activity.citizen,
    affectedCitizen: getAffectedCitizen(activity),
  }));
};

/**
 * Everyone who caused activity on an event that the actor can see, for the
 * actor filter
 *
 * @throws ForbiddenError without `event;read`, NotFoundError when the actor
 * cannot see the event
 */
export const findEventActivityActors = async (
  context: ApplicationContext,
  actor: Actor,
  { eventId }: { readonly eventId: string },
): Promise<EventActivityCitizen[]> => {
  const event = await requireVisibleEvent(context, actor, eventId);

  const rows = await context.prisma.eventActivity.findMany({
    where: {
      eventId: event.id,
      citizenId: {
        not: null,
      },
    },
    distinct: ["citizenId"],
    select: {
      citizen: { select: CITIZEN_REFERENCE_SELECT },
    },
  });

  return rows
    .flatMap((row) => (row.citizen ? [row.citizen] : []))
    .toSorted((first, second) =>
      (first.handle || first.id).localeCompare(second.handle || second.id),
    );
};
