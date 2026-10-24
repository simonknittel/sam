import {
  EventActivityType,
  EventSource,
  EventVisibility,
} from "@sam-monorepo/database/browser";
import { AuditEventType, type AuditEventInput } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext, Notification } from "../context.js";
import {
  DATE_TIME_INPUT_DESCRIPTION,
  dateTimeInputSchema,
} from "../dateTime.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { createEventActivity } from "./eventActivity.js";
import { requireDescriptionFitsDiscord } from "./eventDescription.js";
import {
  DiscordSyncOutcome,
  syncEventDiscordPublication,
  type DiscordSyncResult,
} from "./eventDiscordPublication.js";
import { EventErrorMessage } from "./eventErrors.js";
import {
  eventDescriptionSchema,
  eventNameSchema,
  eventVisibilitySchema,
  visibilityRoleIdsSchema,
} from "./eventInputSchemas.js";
import { VISIBLE_EVENT_MANAGE_GUARD_SELECT } from "./eventManageGuard.js";
import {
  isAllowedToManageEvent,
  isAllowedToManagePositions,
  isEventUpdatable,
} from "./eventManageRules.js";
import { toEventVisibility } from "./eventOutput.js";
import { canActorSeeEvent } from "./eventVisibility.js";
import { resolveVisibilityRoleIds } from "./eventVisibilityRoles.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";

/** What an update changed */
export enum EventChange {
  Name = "name",
  Description = "description",
  /** The start or the end */
  Schedule = "schedule",
  /** The visibility or the visibility roles */
  Visibility = "visibility",
  LineupEnabled = "lineup_enabled",
}

/**
 * Only the fields of the input change. The fields of an event that comes
 * from Discord stay as Discord gives them: only `lineup_enabled` can change.
 */
export const updateEventInputSchema = z.object({
  event_id: idSchema,
  name: eventNameSchema.optional(),
  description: eventDescriptionSchema.optional(),
  start_time: dateTimeInputSchema.optional(),
  end_time: dateTimeInputSchema
    .optional()
    .describe(`After the start. ${DATE_TIME_INPUT_DESCRIPTION}`),
  visibility: eventVisibilitySchema.optional(),
  visibility_role_ids: visibilityRoleIdsSchema
    .optional()
    .describe(
      "The role ids (from list_roles) that see a restricted event. Without it, a restricted event keeps its roles.",
    ),
  lineup_enabled: z
    .boolean()
    .optional()
    .describe(
      "True shows the lineup to the participants and notifies them, false hides it again. Needs can_manage_positions.",
    ),
});

export type UpdateEventInput = z.infer<typeof updateEventInputSchema>;

/** Options of the use case for the app, not fields of the input schema */
export interface UpdateEventOptions {
  /**
   * True when the use case carries a changed name, description or schedule
   * over to the Discord event after the save, and the caller tells the user
   * that a restricted event stays visible on Discord (only the app can show
   * the result). Without it, such a change of an event that is published on
   * Discord is refused: else the Discord event would show outdated data, or
   * the user would not know that the guild still sees the event.
   */
  readonly syncsDiscordPublication?: boolean;
}

/** The Discord step of an update. Only the app reads it (camelCase keys). */
export interface UpdateEventDiscordResult {
  /** Null when the name, the description and the schedule did not change */
  readonly sync: DiscordSyncResult | null;
  /**
   * True when the update made the event restricted and the event is still
   * published: the guild keeps seeing it
   */
  readonly staysVisibleOnDiscord: boolean;
}

export interface UpdateEventOutput {
  readonly event: GetEventOutput;
  /** Empty when the event already had the given values */
  readonly changes: EventChange[];
  /**
   * False when the changes are saved, but the notifications failed. The
   * changes stand, thus the caller must not save them again.
   */
  readonly notifications_sent: boolean;
  /**
   * Only with the option `syncsDiscordPublication`. The MCP tools parse the
   * output with a strict schema, thus the key must not exist without the
   * option.
   */
  readonly discord?: UpdateEventDiscordResult;
}

const NO_DISCORD_CHANGE: UpdateEventDiscordResult = {
  sync: null,
  staysVisibleOnDiscord: false,
};

const DETAIL_FIELDS = [
  "name",
  "description",
  "start_time",
  "end_time",
  "visibility",
  "visibility_role_ids",
] as const satisfies readonly (keyof UpdateEventInput)[];

/** The changes that the event page and the Discord event show */
const CONTENT_CHANGES: ReadonlySet<EventChange> = new Set([
  EventChange.Name,
  EventChange.Description,
  EventChange.Schedule,
]);

const toSortedKey = (roleIds: readonly string[]) =>
  roleIds.toSorted().join(",");

/**
 * Changes the details of an app event (name, description, schedule,
 * visibility) and whether its lineup is visible. Writes nothing when the
 * values are the same.
 */
export const updateEvent = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateEventInput,
  { syncsDiscordPublication = false }: UpdateEventOptions = {},
): Promise<UpdateEventOutput> =>
  withSpan(context, "updateEvent", async () => {
    const changesDetails = DETAIL_FIELDS.some(
      (field) => input[field] !== undefined,
    );
    const changesLineup = input.lineup_enabled !== undefined;

    /**
     * Authorize the request
     */
    const event = await context.prisma.event.findUnique({
      where: {
        id: input.event_id,
        deletedAt: null,
      },
      select: {
        ...VISIBLE_EVENT_MANAGE_GUARD_SELECT,
        source: true,
        name: true,
        description: true,
        lineupEnabled: true,
        discordPublishedId: true,
      },
    });
    // `canActorSeeEvent()` leaves `event;read` to its callers
    if (
      !event ||
      !actor.authorize("event", "read") ||
      !canActorSeeEvent(actor, event)
    )
      throw new NotFoundError(EventErrorMessage.NotFound);
    if (changesDetails && event.source !== EventSource.APP)
      throw new ConflictError(EventErrorMessage.DiscordEvent);
    if (!isEventUpdatable(event, context.now()))
      throw new ConflictError(EventErrorMessage.EventEnded);
    if (changesDetails && !isAllowedToManageEvent(actor, event))
      throw new ForbiddenError("The user cannot manage the event");
    if (changesLineup && !isAllowedToManagePositions(actor, event))
      throw new ForbiddenError("The user cannot manage the lineup");
    const citizenId = actor.citizen?.id ?? null;

    /**
     * Validate the request
     */
    const startTime = input.start_time ?? event.startTime;
    const endTime = input.end_time ?? event.endTime;
    if (changesDetails && (endTime === null || endTime <= startTime))
      throw new ValidationError(EventErrorMessage.EndBeforeStart);
    requireDescriptionFitsDiscord(context, input.description);

    const visibility = input.visibility
      ? toEventVisibility(input.visibility)
      : event.visibility;
    const previousRoleIds = event.visibilityRoles.map(
      (visibilityRole) => visibilityRole.roleId,
    );
    const visibilityRoleIds = changesDetails
      ? await resolveVisibilityRoleIds(
          context,
          actor,
          visibility,
          input.visibility_role_ids ?? previousRoleIds,
          previousRoleIds,
        )
      : previousRoleIds;

    /**
     * Diff the fields
     */
    const name = input.name ?? event.name;
    const description =
      input.description === undefined
        ? event.description
        : input.description || null;

    const changes: EventChange[] = [];
    if (name !== event.name) changes.push(EventChange.Name);
    if (description !== event.description)
      changes.push(EventChange.Description);
    if (
      startTime.getTime() !== event.startTime.getTime() ||
      endTime?.getTime() !== event.endTime?.getTime()
    )
      changes.push(EventChange.Schedule);
    if (
      visibility !== event.visibility ||
      toSortedKey(previousRoleIds) !== toSortedKey(visibilityRoleIds)
    )
      changes.push(EventChange.Visibility);
    if (changesLineup && input.lineup_enabled !== event.lineupEnabled)
      changes.push(EventChange.LineupEnabled);

    const changesContent = changes.some((change) =>
      CONTENT_CHANGES.has(change),
    );
    const changesDetailFields = changes.some(
      (change) => change !== EventChange.LineupEnabled,
    );
    const changesLineupEnabled = changes.includes(EventChange.LineupEnabled);

    if (changes.length <= 0)
      return {
        event: await loadEventOutput(context, actor, event.id),
        changes,
        notifications_sent: true,
        ...(syncsDiscordPublication ? { discord: NO_DISCORD_CHANGE } : {}),
      };

    /**
     * The guild keeps seeing a published event, thus a restricted event
     * stays visible on Discord
     */
    const restrictsVisibility =
      changes.includes(EventChange.Visibility) &&
      visibility === EventVisibility.RESTRICTED;
    if (
      (changesContent || restrictsVisibility) &&
      event.discordPublishedId !== null &&
      !syncsDiscordPublication
    )
      throw new ConflictError(EventErrorMessage.PublishedOnDiscord);

    /**
     * Update the event and record the activity entries atomically
     */
    await context.prisma.$transaction(async (transaction) => {
      await transaction.event.update({
        where: {
          id: event.id,
        },
        data: {
          ...(changesDetailFields
            ? {
                name,
                description,
                startTime,
                endTime,
                visibility,
                visibilityRoles: {
                  deleteMany: {},
                  create: visibilityRoleIds.map((roleId) => ({ roleId })),
                },
              }
            : {}),
          ...(changesLineupEnabled
            ? { lineupEnabled: input.lineup_enabled }
            : {}),
        },
      });

      if (changes.includes(EventChange.Name))
        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId,
          type: EventActivityType.TITLE_UPDATED,
          payload: {
            previousName: event.name,
            newName: name,
          },
        });

      if (changes.includes(EventChange.Description))
        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId,
          type: EventActivityType.DESCRIPTION_UPDATED,
          payload: null,
        });

      if (changes.includes(EventChange.Schedule))
        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId,
          type: EventActivityType.SCHEDULE_UPDATED,
          payload: {
            previousStartTime: event.startTime.toISOString(),
            newStartTime: startTime.toISOString(),
            previousEndTime: event.endTime?.toISOString() ?? null,
            newEndTime: endTime?.toISOString() ?? null,
          },
        });

      /**
       * The activity feed only exists on app events; recorded in both
       * directions, rendered as "published"/"withdrawn".
       */
      if (changesLineupEnabled && event.source === EventSource.APP)
        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId,
          type: EventActivityType.LINEUP_TOGGLED,
          payload: { enabled: input.lineup_enabled === true },
        });
    });

    const auditEvents: AuditEventInput[] = [];
    if (changesContent)
      auditEvents.push({
        type: AuditEventType.EVENT_UPDATED_IN_APP,
        data: {
          eventId: event.id,
          changedFields: changes.flatMap((change) =>
            CONTENT_CHANGES.has(change) ? [change] : [],
          ),
        },
        createdById: actor.userId,
      });
    if (changes.includes(EventChange.Visibility))
      auditEvents.push({
        type: AuditEventType.EVENT_VISIBILITY_UPDATED,
        data: {
          eventId: event.id,
          visibility,
          roleIds: visibilityRoleIds,
        },
        createdById: actor.userId,
      });
    if (changesLineupEnabled)
      auditEvents.push({
        type: AuditEventType.EVENT_LINEUP_STATUS_CHANGED,
        data: {
          eventId: event.id,
          enabled: input.lineup_enabled === true,
        },
        createdById: actor.userId,
      });
    await context.audit.create(auditEvents);

    const notifications: Notification[] = [];
    if (changesContent)
      notifications.push({
        type: "EventUpdated",
        payload: { eventId: event.id },
      });
    if (changesLineupEnabled && input.lineup_enabled)
      notifications.push({
        type: "EventLineupEnabled",
        payload: { eventId: event.id },
      });
    const notificationsSent =
      notifications.length > 0
        ? await triggerNotificationsAfterSave(context, notifications)
        : true;

    /**
     * Carry the change over to Discord if the event is published there. A
     * no-op otherwise, and never able to undo the save above — a Discord
     * problem only comes back as a warning next to the success message.
     */
    const discord = syncsDiscordPublication
      ? await syncDiscordAfterUpdate(context, event.id, {
          changesContent,
          restrictsVisibility,
        })
      : null;

    return {
      event: await loadEventOutput(context, actor, event.id),
      changes,
      notifications_sent: notificationsSent,
      ...(discord ? { discord } : {}),
    };
  });

/**
 * Narrowing a published event's visibility does not narrow it on Discord —
 * the guild keeps seeing it. The caller says it out loud rather than
 * silently unpublishing, which would be a surprise of its own. The publish
 * state is read after the sync, because a sync can clear it.
 *
 * A failure cannot undo the save, thus a thrown error becomes Failed: else
 * the user would save the change again.
 */
const syncDiscordAfterUpdate = async (
  context: ApplicationContext,
  eventId: string,
  {
    changesContent,
    restrictsVisibility,
  }: {
    readonly changesContent: boolean;
    readonly restrictsVisibility: boolean;
  },
): Promise<UpdateEventDiscordResult> => {
  try {
    const sync = changesContent
      ? await syncEventDiscordPublication(context, eventId)
      : null;

    const staysVisibleOnDiscord =
      restrictsVisibility &&
      (
        await context.prisma.event.findUnique({
          where: { id: eventId },
          select: { discordPublishedId: true },
        })
      )?.discordPublishedId != null;

    return { sync, staysVisibleOnDiscord };
  } catch (error) {
    context.log.error("Failed to carry an event change over to Discord", {
      eventId,
      error,
    });
    return {
      sync: { outcome: DiscordSyncOutcome.Failed },
      staysVisibleOnDiscord: false,
    };
  }
};
