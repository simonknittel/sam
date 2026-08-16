"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { probeUploadImageDimensions } from "@/modules/common/utils/probeUploadImageDimensions";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import {
  EventActivityType,
  EventSource,
  EventVisibility,
} from "@sam-monorepo/database/client";
import { buildBriefingRootPageSeed } from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { berlinWallTimeToUtc } from "../utils/berlinWallTime";
import { createEventActivity } from "../utils/eventActivity";

const WALL_TIME_SCHEMA = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Ungültiges Datum");

const schema = z.object({
  name: z.string().trim().min(1).max(128),
  description: z.string().trim().max(2000).optional(),
  startTime: WALL_TIME_SCHEMA,
  endTime: WALL_TIME_SCHEMA,
  visibility: z.enum(EventVisibility),
  visibilityRoleIds: z.array(z.cuid()).max(50).optional(),
  coverImageId: z.cuid().optional(),
});

export const createEvent = createAuthenticatedAction(
  "createEvent",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!(await authentication.authorize("event", "create")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    const citizenId = authentication.session.entity.id;

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
     * The cover was uploaded by the form before submitting; it must be the
     * submitter's own image so nobody can attach someone else's upload.
     */
    if (data.coverImageId) {
      const coverImage = await prisma.upload.findUnique({
        where: { id: data.coverImageId },
        select: { createdById: true, mimeType: true },
      });
      if (
        !coverImage ||
        coverImage.createdById !== authentication.session.user.id ||
        !coverImage.mimeType.startsWith("image/")
      )
        return {
          error: "Ungültiges Titelbild",
          requestPayload: formData,
        };
    }

    /**
     * Create the event with its briefing root page and activity entry
     */
    const createdEvent = await prisma.$transaction(async (transaction) => {
      const event = await transaction.event.create({
        data: {
          source: EventSource.APP,
          name: data.name,
          description: data.description || null,
          startTime,
          endTime,
          visibility: data.visibility,
          visibilityRoles: {
            create: visibilityRoleIds.map((roleId) => ({ roleId })),
          },
          createdById: citizenId,
          coverImageId: data.coverImageId ?? null,
          wikiPages: {
            create: buildBriefingRootPageSeed(citizenId),
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      await createEventActivity(transaction, {
        eventId: event.id,
        citizenId,
        type: EventActivityType.CREATED,
        payload: null,
      });

      return event;
    });

    if (data.coverImageId) probeUploadImageDimensions(data.coverImageId);

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_CREATED_IN_APP,
        data: {
          eventId: createdEvent.id,
          name: createdEvent.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Trigger notifications
     */
    await triggerNotifications([
      {
        type: "EventCreated",
        payload: {
          eventId: createdEvent.id,
        },
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/events");
    revalidatePath("/app/dashboard");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      visibility: formData.get("visibility"),
      visibilityRoleIds: formData.getAll("visibilityRole[]"),
      coverImageId: formData.get("coverImageId") || undefined,
    }),
  },
);
