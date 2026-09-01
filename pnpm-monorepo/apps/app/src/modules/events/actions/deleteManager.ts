"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { EventActivityType } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EVENT_MANAGE_GUARD_SELECT } from "../queries/eventManageGuardSelect";
import { createEventActivity } from "../utils/eventActivity";
import { isAllowedToManageEvent } from "../utils/isAllowedToManageEvent";
import { isEventUpdatable } from "../utils/isEventUpdatable";

const schema = z.object({
  eventId: z.cuid(),
  managerId: z.cuid(),
});

export const deleteManager = createAuthenticatedAction(
  "deleteManager",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    const event = await prisma.event.findUnique({
      where: {
        id: data.eventId,
      },
      select: EVENT_MANAGE_GUARD_SELECT,
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

    const actingManagerId = authentication.session.entity?.id ?? null;

    /**
     * `disconnect` is idempotent, so without this check a repeated removal
     * would get an activity entry for a change that never happened.
     */
    const isManager = event.managers.some(
      (manager) => manager.id === data.managerId,
    );
    if (!isManager)
      return {
        error: "Der Citizen ist kein Manager des Events.",
        requestPayload: formData,
      };

    /**
     * Delete manager. One transaction, so the activity entry cannot get lost
     * while the removal goes through.
     */
    await prisma.$transaction(async (transaction) => {
      await transaction.event.update({
        where: {
          id: event.id,
        },
        data: {
          managers: {
            disconnect: {
              id: data.managerId,
            },
          },
        },
      });

      await createEventActivity(transaction, {
        eventId: event.id,
        citizenId: actingManagerId,
        type: EventActivityType.MANAGER_REMOVED,
        payload: { citizenId: data.managerId },
      });
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_MANAGER_REMOVED,
        data: {
          eventId: event.id,
          managerId: data.managerId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/events/${event.id}`, "layout");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
