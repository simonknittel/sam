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
  managerIds: z.array(z.string().trim().cuid()).max(50), // Arbitrary (untested) limit to prevent DDoS
});

export const createManagers = createAuthenticatedAction(
  "createManagers",
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
      return { error: t("Common.forbidden"), requestPayload: formData };

    const actingManagerId = authentication.session.entity?.id ?? null;

    /**
     * `connect` is idempotent, so a citizen who already manages the event
     * would otherwise get an activity entry for a change that never happened.
     */
    const existingManagerIds = new Set(
      event.managers.map((manager) => manager.id),
    );
    const managerIdsToAdd = Array.from(new Set(data.managerIds)).filter(
      (managerId) => !existingManagerIds.has(managerId),
    );

    /**
     * Create managers. One transaction, so the activity entries cannot get
     * lost while the assignment goes through.
     */
    await prisma.$transaction(async (transaction) => {
      await transaction.event.update({
        where: {
          id: event.id,
        },
        data: {
          managers: {
            connect: managerIdsToAdd.map((managerId) => ({
              id: managerId,
            })),
          },
        },
      });

      for (const managerId of managerIdsToAdd)
        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId: actingManagerId,
          type: EventActivityType.MANAGER_ADDED,
          payload: { citizenId: managerId },
        });
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_MANAGERS_ASSIGNED,
        data: {
          eventId: event.id,
          managerIds: data.managerIds,
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
      success: "Erfolgreich gespeichert.",
    };
  },
  {
    parseFormData: (formData) => ({
      eventId: formData.get("eventId"),
      managerIds: formData.getAll("managerId[]"),
    }),
  },
);
