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

export type EventActivityCitizen = CitizenReferenceRow;

export interface EventActivityRowsInput extends ActivitySourceInput {
  readonly eventId: string;
  /** Null: all types */
  readonly types: readonly EventActivityType[] | null;
}

export interface EventActivityRow {
  readonly id: string;
  readonly type: EventActivityType;
  readonly createdAt: Date;
  /** The renderer parses it for each type */
  readonly payload: Prisma.JsonValue;
  readonly actor: EventActivityCitizen | null;
  /**
   * Null for a type without an affected citizen, or when the citizen does not
   * exist (anymore)
   */
  readonly affectedCitizen: EventActivityCitizen | null;
}

const TYPES_WITH_AFFECTED_CITIZEN_IN_PAYLOAD: ReadonlySet<EventActivityType> =
  new Set([
    EventActivityType.PARTICIPATION_ADDED_BY_MANAGER,
    EventActivityType.PARTICIPATION_REMOVED_BY_MANAGER,
    EventActivityType.MANAGER_ADDED,
    EventActivityType.MANAGER_REMOVED,
    EventActivityType.INVITATION_CREATED,
    EventActivityType.INVITATION_WITHDRAWN,
    EventActivityType.APPLICATION_APPROVED,
    EventActivityType.APPLICATION_DECLINED,
    EventActivityType.APPLICATION_WITHDRAWN,
  ]);

const SELF_APPLIED_TYPES: ReadonlySet<EventActivityType> = new Set([
  EventActivityType.PARTICIPATION_SIGNED_UP,
  EventActivityType.PARTICIPATION_COMMENT_UPDATED,
  EventActivityType.PARTICIPATION_CANCELLED,
  EventActivityType.INVITATION_ACCEPTED,
  EventActivityType.INVITATION_DECLINED,
  EventActivityType.APPLICATION_CREATED,
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
