"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import {
  EventActivityType,
  EventSource,
  EventVisibility,
} from "@sam-monorepo/database/client";
import type { AuditEventInput } from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { berlinWallTimeToUtc } from "../utils/berlinWallTime";
import {
  getDiscordSyncWarning,
  syncDiscordEventPublication,
} from "../utils/discordPublishing";
import { createEventActivity } from "../utils/eventActivity";
import {
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_MAX_VISIBILITY_ROLES,
  EVENT_NAME_MAX_LENGTH,
} from "../utils/eventConstraints";
import { isAllowedToManageEvent } from "../utils/isAllowedToManageEvent";
import { isEventUpdatable } from "../utils/isEventUpdatable";

const WALL_TIME_SCHEMA = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Ungültiges Datum");

const schema = z.object({
  eventId: z.cuid(),
  name: z.string().trim().min(1).max(EVENT_NAME_MAX_LENGTH),
  description: z.string().trim().max(EVENT_DESCRIPTION_MAX_LENGTH).optional(),
  startTime: WALL_TIME_SCHEMA,
  endTime: WALL_TIME_SCHEMA,
  visibility: z.enum(EventVisibility),
  visibilityRoleIds: z
    .array(z.cuid())
    .max(EVENT_MAX_VISIBILITY_ROLES)
    .optional(),
});

export const updateEvent = createAuthenticatedAction(
  "updateEvent",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    const event = await prisma.event.findUnique({
      where: {
        id: data.eventId,
        source: EventSource.APP,
        deletedAt: null,
      },
      include: {
        managers: true,
        visibilityRoles: true,
      },
    });
    if (!event)
      return { error: "Event nicht gefunden", requestPayload: formData };
    if (!isEventUpdatable(event))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };
    if (!(await isAllowedToManageEvent(event)))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    const citizenId = authentication.session.entity?.id ?? null;

    /**
     * Validate the request
     */
    const startTime = berlinWallTimeToUtc(data.startTime);
    const endTime = berlinWallTimeToUtc(data.endTime);
    if (endTime <= startTime)
      return {
        error: "Das Ende muss nach dem Start liegen.",
        requestPayload: formData,
      };

    const visibilityRoleIds =
      data.visibility === EventVisibility.RESTRICTED
        ? (data.visibilityRoleIds ?? [])
        : [];
    if (
      data.visibility === EventVisibility.RESTRICTED &&
      visibilityRoleIds.length === 0
    )
      return {
        error: "Wähle mindestens eine Rolle aus.",
        requestPayload: formData,
      };

    /**
     * Diff the fields
     */
    const description = data.description || null;
    const nameChanged = event.name !== data.name;
    const descriptionChanged = event.description !== description;
    const scheduleChanged =
      event.startTime.getTime() !== startTime.getTime() ||
      event.endTime?.getTime() !== endTime.getTime();

    const previousRoleIds = event.visibilityRoles
      .map((visibilityRole) => visibilityRole.roleId)
      .toSorted();
    const visibilityChanged =
      event.visibility !== data.visibility ||
      previousRoleIds.join(",") !== visibilityRoleIds.toSorted().join(",");

    if (
      !nameChanged &&
      !descriptionChanged &&
      !scheduleChanged &&
      !visibilityChanged
    )
      return { success: t("Common.successfullySaved") };

    /**
     * Update the event and record the activity entries atomically
     */
    await prisma.$transaction(async (transaction) => {
      await transaction.event.update({
        where: {
          id: event.id,
        },
        data: {
          name: data.name,
          description,
          startTime,
          endTime,
          visibility: data.visibility,
          visibilityRoles: {
            deleteMany: {},
            create: visibilityRoleIds.map((roleId) => ({ roleId })),
          },
        },
      });

      if (nameChanged)
        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId,
          type: EventActivityType.TITLE_UPDATED,
          payload: {
            previousName: event.name,
            newName: data.name,
          },
        });

      if (descriptionChanged)
        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId,
          type: EventActivityType.DESCRIPTION_UPDATED,
          payload: null,
        });

      if (scheduleChanged)
        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId,
          type: EventActivityType.SCHEDULE_UPDATED,
          payload: {
            previousStartTime: event.startTime.toISOString(),
            newStartTime: startTime.toISOString(),
            previousEndTime: event.endTime?.toISOString() ?? null,
            newEndTime: endTime.toISOString(),
          },
        });
    });

    const auditEvents: AuditEventInput[] = [];
    if (nameChanged || descriptionChanged || scheduleChanged) {
      auditEvents.push({
        type: AuditEventType.EVENT_UPDATED_IN_APP,
        data: {
          eventId: event.id,
          changedFields: [
            ...(nameChanged ? ["name"] : []),
            ...(descriptionChanged ? ["description"] : []),
            ...(scheduleChanged ? ["schedule"] : []),
          ],
        },
        createdById: authentication.session.user.id,
      });
    }
    if (visibilityChanged) {
      auditEvents.push({
        type: AuditEventType.EVENT_VISIBILITY_UPDATED,
        data: {
          eventId: event.id,
          visibility: data.visibility,
          roleIds: visibilityRoleIds,
        },
        createdById: authentication.session.user.id,
      });
    }
    await createAuditEvents(auditEvents);

    /**
     * Trigger notifications
     */
    if (nameChanged || descriptionChanged || scheduleChanged) {
      await triggerNotifications([
        {
          type: "EventUpdated",
          payload: {
            eventId: event.id,
          },
        },
      ]);
    }

    /**
     * Carry the change over to Discord if the event is published there. A
     * no-op otherwise, and never able to undo the save above — a Discord
     * problem only comes back as a warning next to the success message.
     */
    const discordSyncWarning =
      nameChanged || descriptionChanged || scheduleChanged
        ? getDiscordSyncWarning(await syncDiscordEventPublication(event.id))
        : null;

    /**
     * Narrowing a published event's visibility does not narrow it on
     * Discord — the guild keeps seeing it. Said out loud rather than
     * silently unpublishing, which would be a surprise of its own.
     */
    const becameRestrictedWhilePublished =
      event.discordPublishedId !== null &&
      visibilityChanged &&
      data.visibility === EventVisibility.RESTRICTED;

    const warning =
      discordSyncWarning ??
      (becameRestrictedWhilePublished
        ? "Das Event bleibt auf Discord für alle Mitglieder des Servers sichtbar. Entferne es dort, wenn das nicht gewollt ist."
        : null);

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/events");
    revalidatePath(`/app/events/${event.id}`, "layout");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
      ...(warning ? { warning } : {}),
    };
  },
  {
    parseFormData: (formData) => ({
      eventId: formData.get("eventId"),
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      visibility: formData.get("visibility"),
      visibilityRoleIds: formData.getAll("visibilityRole[]"),
    }),
  },
);
