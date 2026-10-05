"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { log } from "@/modules/logging";
import { triggerNotificationsAfterSave } from "@/modules/notifications/utils/triggerNotification";
import { EventSource } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";
import { EVENT_MANAGE_GUARD_SELECT } from "../queries/eventManageGuardSelect";
import {
  DiscordSyncOutcome,
  removeDiscordEventPublication,
} from "../utils/discordPublishing";
import { isAllowedToManageEvent } from "../utils/isAllowedToManageEvent";
import { isEventUpdatable } from "../utils/isEventUpdatable";
import { rejectConflict } from "../utils/rejectConflict";

const schema = z.object({
  eventId: z.cuid(),
});

export const deleteEvent = createAuthenticatedAction(
  "deleteEvent",
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
      select: {
        ...EVENT_MANAGE_GUARD_SELECT,
        name: true,
      },
    });
    if (!event) return rejectConflict("Event nicht gefunden", formData);
    if (!isEventUpdatable(event))
      return rejectConflict("Das Event ist bereits vorbei.", formData);
    if (!(await isAllowedToManageEvent(event)))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Soft-delete the event. The row stays resolvable, so the notification
     * router can still look up the event and its participants afterwards.
     * The condition on `deletedAt` lets only one of two parallel requests
     * (a double click, two managers) delete the event. The other request
     * stops here, thus it removes nothing from Discord and sends nothing.
     */
    const { count } = await prisma.event.updateMany({
      where: {
        id: event.id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        deletedById: authentication.session.entity?.id ?? null,
      },
    });
    if (count === 0) return rejectConflict("Event nicht gefunden", formData);

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_DELETED_IN_APP,
        data: {
          eventId: event.id,
          name: event.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Take the event off Discord: the deleted event is not shown anywhere
     * in the app, thus the manager cannot do it later from the app. A failure
     * cannot undo the deletion — hence the catch — and comes back as a
     * warning, so that the manager deletes the Discord event by hand.
     */
    const discordResult = await removeDiscordEventPublication(event.id, {
      userId: authentication.session.user.id,
      citizenId: authentication.session.entity?.id ?? null,
    }).catch((error: unknown) => {
      log.error("Failed to remove a deleted event from Discord", {
        eventId: event.id,
        error,
      });
      return { outcome: DiscordSyncOutcome.Failed } as const;
    });

    /**
     * Trigger notifications
     */
    const areNotificationsSent = await triggerNotificationsAfterSave([
      {
        type: "EventDeleted",
        payload: {
          eventId: event.id,
        },
      },
    ]);

    /**
     * Respond with the result
     */
    const warnings = [
      discordResult.outcome === DiscordSyncOutcome.Failed
        ? "Das Event konnte nicht von Discord entfernt werden und muss dort von Hand gelöscht werden."
        : null,
      areNotificationsSent ? null : t("Common.notificationsFailed"),
    ].filter((warning) => warning !== null);

    return {
      success: "Das Event wurde gelöscht.",
      ...(warnings.length > 0 ? { warning: warnings.join(" ") } : {}),
    };
  },
);
