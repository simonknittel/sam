"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { probeUploadImageDimensions } from "@/modules/common/utils/probeUploadImageDimensions";
import { DISCORD_EVENT_LOCATION_MAX_LENGTH } from "@/modules/discord/utils/guildScheduledEventPayload";
import {
  EventDiscordPublishTarget,
  EventVisibility,
} from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getEventTemplateById } from "../queries/getEventTemplateById";
import {
  EVENT_TEMPLATE_DESCRIPTION_MAX_LENGTH,
  EVENT_TEMPLATE_MAX_ROLES,
  EVENT_TEMPLATE_NAME_MAX_LENGTH,
  EVENT_TEMPLATES_PATH,
  getEventTemplatePath,
} from "../utils/eventTemplateConstraints";

/** The empty marker the cover field submits when no image is selected */
const NO_COVER = "";

const schema = z.object({
  templateId: z.cuid2(),
  name: z.string().trim().min(1).max(EVENT_TEMPLATE_NAME_MAX_LENGTH),
  description: z
    .string()
    .trim()
    .max(EVENT_TEMPLATE_DESCRIPTION_MAX_LENGTH)
    .optional(),
  coverImageId: z.union([z.cuid(), z.literal(NO_COVER)]),
  visibility: z.enum(EventVisibility),
  visibilityRoleIds: z.array(z.cuid()).max(EVENT_TEMPLATE_MAX_ROLES).optional(),
  /**
   * The Discord publishing an event created from this template starts with.
   * Absent means "do not publish".
   */
  discordPublishTarget: z.enum(EventDiscordPublishTarget).optional(),
  discordPublishChannelId: z.string().max(64).optional(),
  discordPublishLocation: z
    .string()
    .trim()
    .max(DISCORD_EVENT_LOCATION_MAX_LENGTH)
    .optional(),
});

export const updateEventTemplate = createAuthenticatedAction(
  "updateEventTemplate",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    const context = await getEventTemplateById(data.templateId);
    if (!context)
      return { error: "Vorlage nicht gefunden", requestPayload: formData };
    if (context.template.deletedAt !== null)
      return { error: "Die Vorlage ist gelöscht.", requestPayload: formData };
    if (!context.permissions.canEdit)
      return { error: t("Common.forbidden"), requestPayload: formData };
    const citizenId = authentication.session.entity?.id ?? null;

    /**
     * Validate the request
     */
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
     * A newly picked cover must be the submitter's own image so nobody can
     * attach someone else's upload; keeping the current one needs no check.
     */
    const coverImageId =
      data.coverImageId === NO_COVER ? null : data.coverImageId;
    const isNewCover =
      coverImageId !== null && coverImageId !== context.template.coverImageId;
    if (isNewCover) {
      const coverImage = await prisma.upload.findUnique({
        where: { id: coverImageId },
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
     * The three publish columns only make sense together — a CHECK
     * constraint enforces that — so they are always written as one set.
     */
    const publishesToChannel =
      data.discordPublishTarget === EventDiscordPublishTarget.CHANNEL;
    if (publishesToChannel && !data.discordPublishChannelId)
      return {
        error: "Wähle einen Discord-Kanal aus.",
        requestPayload: formData,
      };

    await prisma.eventTemplate.update({
      where: { id: context.template.id },
      data: {
        name: data.name,
        description: data.description || null,
        coverImageId,
        visibility: data.visibility,
        visibilityRoles: {
          deleteMany: {},
          create: visibilityRoleIds.map((roleId) => ({ roleId })),
        },
        discordPublishTarget: data.discordPublishTarget ?? null,
        discordPublishChannelId: publishesToChannel
          ? (data.discordPublishChannelId ?? null)
          : null,
        discordPublishLocation:
          data.discordPublishTarget === EventDiscordPublishTarget.EXTERNAL
            ? data.discordPublishLocation || null
            : null,
        updatedById: citizenId,
      },
    });

    if (isNewCover) probeUploadImageDimensions(coverImageId);

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_TEMPLATE_UPDATED,
        data: {
          templateId: context.template.id,
          previousName: context.template.name,
          name: data.name,
          visibility: data.visibility,
          visibilityRoleIds,
          coverImageChanged: coverImageId !== context.template.coverImageId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath(EVENT_TEMPLATES_PATH);
    revalidatePath(getEventTemplatePath(context.template.id), "layout");

    return { success: t("Common.successfullySaved") };
  },
  {
    parseFormData: (formData) => ({
      templateId: formData.get("templateId"),
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      coverImageId: formData.get("coverImageId") ?? NO_COVER,
      visibility: formData.get("visibility"),
      visibilityRoleIds: formData.getAll("visibilityRole[]"),
      discordPublishTarget: formData.get("discordPublishTarget") || undefined,
      discordPublishChannelId:
        formData.get("discordPublishChannelId") || undefined,
      discordPublishLocation:
        formData.get("discordPublishLocation") || undefined,
    }),
  },
);
