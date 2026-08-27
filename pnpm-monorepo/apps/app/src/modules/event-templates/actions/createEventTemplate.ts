"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { probeUploadImageDimensions } from "@/modules/common/utils/probeUploadImageDimensions";
import { DISCORD_EVENT_DESCRIPTION_MAX_LENGTH } from "@/modules/discord/utils/guildScheduledEventPayload";
import { findDescriptionProblem } from "@/modules/events/utils/discordEventDescription";
import { buildBriefingRootPageSeed } from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  EVENT_TEMPLATE_NAME_MAX_LENGTH,
  EVENT_TEMPLATES_PATH,
  getEventTemplatePath,
} from "../utils/eventTemplateConstraints";

const schema = z.object({
  name: z.string().trim().min(1).max(EVENT_TEMPLATE_NAME_MAX_LENGTH),
  /** See `updateEvent` for why this is Discord's limit and not the app's. */
  description: z
    .string()
    .trim()
    .max(DISCORD_EVENT_DESCRIPTION_MAX_LENGTH)
    .optional(),
  coverImageId: z.cuid().optional(),
});

export const createEventTemplate = createAuthenticatedAction(
  "createEventTemplate",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request. Everyone who may create events may keep
     * personal templates; sharing them takes the extra permission.
     */
    if (!(await authentication.authorize("event", "create")))
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (!authentication.session.entity)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const descriptionProblem = findDescriptionProblem(data.description);
    if (descriptionProblem)
      return { error: descriptionProblem, requestPayload: formData };
    const citizenId = authentication.session.entity.id;

    /**
     * The cover was uploaded by the form before submitting; it must be the
     * submitter's own image so nobody can attach someone else's upload.
     */
    if (data.coverImageId) {
      const coverImage = await prisma.upload.findUnique({
        where: { id: data.coverImageId },
        select: { createdById: true, mimeType: true },
      });
      const isOwnImageUpload =
        coverImage !== null &&
        coverImage.createdById === authentication.session.user.id &&
        coverImage.mimeType.startsWith("image/");
      if (!isOwnImageUpload)
        return { error: "Ungültiges Titelbild", requestPayload: formData };
    }

    /**
     * Create the template with the same manager-scoped briefing root page an
     * event gets, so the blueprint starts out like the thing it describes.
     */
    const template = await prisma.eventTemplate.create({
      data: {
        name: data.name,
        description: data.description || null,
        coverImageId: data.coverImageId ?? null,
        createdById: citizenId,
        updatedById: citizenId,
        ownedById: citizenId,
        wikiPages: {
          create: buildBriefingRootPageSeed(citizenId),
        },
      },
      select: { id: true, name: true },
    });

    if (data.coverImageId) probeUploadImageDimensions(data.coverImageId);

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_TEMPLATE_CREATED,
        data: { templateId: template.id, name: template.name },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath(EVENT_TEMPLATES_PATH);

    /**
     * Redirect to the new template, where lineup, briefing and prefill are
     * edited; the form's success hook closes the modal while the navigation
     * is in flight (see useAction).
     */
    redirect(getEventTemplatePath(template.id));
  },
  {
    parseFormData: (formData) => ({
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      coverImageId: formData.get("coverImageId") || undefined,
    }),
  },
);
