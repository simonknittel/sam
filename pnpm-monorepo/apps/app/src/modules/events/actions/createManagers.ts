"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EVENT_MANAGE_GUARD_SELECT } from "../queries/eventManageGuardSelect";
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

    /**
     * Create managers
     */
    await prisma.event.update({
      where: {
        id: event.id,
      },
      data: {
        managers: {
          connect: data.managerIds.map((id) => ({
            id,
          })),
        },
      },
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
    revalidatePath(`/app/events/${event.id}/participants`);

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
