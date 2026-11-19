import { EventDiscordPublishTarget } from "@sam-monorepo/database/browser";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound, ValidationError } from "../errors.js";
import { requireOwnCoverImage } from "../events/coverImage.js";
import { requireDescriptionFitsDiscord } from "../events/eventDescription.js";
import { discordPublishFieldsShape } from "../events/eventDiscordPublication.js";
import { EventErrorMessage } from "../events/eventErrors.js";
import {
  eventDescriptionSchema,
  eventNameSchema,
  eventVisibilitySchema,
  visibilityRoleIdsSchema,
} from "../events/eventInputSchemas.js";
import { toEventVisibility } from "../events/eventOutput.js";
import { resolveVisibilityRoleIds } from "../events/eventVisibilityRoles.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { requireEditableEventTemplate } from "./eventTemplateAccess.js";
import { EventTemplateErrorMessage } from "./eventTemplateErrors.js";

/** Only the fields of the input change */
export const updateEventTemplateInputSchema = z.object({
  template_id: idSchema,
  name: eventNameSchema.optional(),
  description: eventDescriptionSchema.optional(),
  /**
   * The visibility of the events that the template creates. Without it, the
   * visibility roles also stay.
   */
  visibility: eventVisibilitySchema.optional(),
  visibility_role_ids: visibilityRoleIdsSchema.optional(),
  /** The participation switch of the events that the template creates */
  participation_enabled: z.boolean().optional(),
  /** The application switch of the events that the template creates */
  application_required: z.boolean().optional(),
  /** The Discord publishing an event created from this template starts with */
  ...discordPublishFieldsShape,
  /**
   * Null for no publishing. Without it, the channel and the location also
   * stay.
   */
  discord_publish_target: z
    .enum(EventDiscordPublishTarget)
    .nullable()
    .optional(),
});

export type UpdateEventTemplateInput = z.infer<
  typeof updateEventTemplateInputSchema
>;

/** The parts of a template change that only the app gives: the uploads */
export interface UpdateEventTemplateOptions {
  /**
   * The cover image: an image that the actor uploaded (the use case checks a
   * new one), null for no cover. Absent keeps the current cover.
   */
  readonly coverImageId?: string | null;
}

export interface UpdateEventTemplateOutput {
  readonly id: string;
  readonly name: string;
  /** True when the write changed or removed the cover image */
  readonly cover_image_changed: boolean;
}

/**
 * Changes the template's own data and everything it prefills into a new
 * event. The visibility here describes the future event, not who may see the
 * template: the role shares decide that.
 */
export const updateEventTemplate = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateEventTemplateInput,
  options: UpdateEventTemplateOptions = {},
): Promise<UpdateEventTemplateOutput> =>
  withSpan(context, "updateEventTemplate", async () => {
    /**
     * Authorize the request
     */
    const { template } = await requireEditableEventTemplate(
      context,
      actor,
      input.template_id,
      {
        select: {
          name: true,
          coverImageId: true,
          visibilityRoles: { select: { roleId: true } },
        },
      },
    );
    const citizenId = actor.citizen?.id ?? null;

    requireDescriptionFitsDiscord(context, input.description);

    /**
     * Validate the request
     */
    const visibility = input.visibility
      ? toEventVisibility(input.visibility)
      : undefined;
    const visibilityRoleIds = visibility
      ? await resolveVisibilityRoleIds(
          context,
          actor,
          visibility,
          input.visibility_role_ids ?? [],
          template.visibilityRoles.map(
            (visibilityRole) => visibilityRole.roleId,
          ),
        )
      : undefined;

    /**
     * A newly picked cover must be the actor's own image so nobody can
     * attach someone else's upload; keeping the current one needs no check.
     */
    const coverImageId =
      options.coverImageId === undefined
        ? template.coverImageId
        : options.coverImageId;
    const coverImageChanged = coverImageId !== template.coverImageId;
    if (coverImageChanged && coverImageId !== null) {
      if (citizenId === null)
        throw new ValidationError(EventErrorMessage.InvalidCoverImage);

      await requireOwnCoverImage(context, citizenId, coverImageId);
    }

    /**
     * The three publish columns only make sense together — a CHECK
     * constraint enforces that — so they are always written as one set.
     */
    const publishesToChannel =
      input.discord_publish_target === EventDiscordPublishTarget.CHANNEL;
    if (publishesToChannel && !input.discord_publish_channel_id)
      throw new ValidationError(EventTemplateErrorMessage.ChannelMissing);

    const discordPublishData =
      input.discord_publish_target === undefined
        ? {}
        : {
            discordPublishTarget: input.discord_publish_target,
            discordPublishChannelId: publishesToChannel
              ? (input.discord_publish_channel_id ?? null)
              : null,
            discordPublishLocation:
              input.discord_publish_target ===
              EventDiscordPublishTarget.EXTERNAL
                ? input.discord_publish_location || null
                : null,
          };

    /**
     * The condition on `deletedAt` keeps a different request from deleting
     * the template between the check and the write unnoticed
     */
    const updatedTemplate = await rethrowRecordNotFound(
      () =>
        context.prisma.eventTemplate.update({
          where: { id: template.id, deletedAt: null },
          /** Prisma writes no field that is undefined */
          data: {
            name: input.name,
            description:
              input.description === undefined
                ? undefined
                : input.description || null,
            coverImageId,
            visibility,
            visibilityRoles: visibilityRoleIds && {
              deleteMany: {},
              create: visibilityRoleIds.map((roleId) => ({ roleId })),
            },
            participationEnabled: input.participation_enabled,
            applicationRequired: input.application_required,
            ...discordPublishData,
            updatedById: citizenId,
          },
          select: {
            id: true,
            name: true,
            visibility: true,
            visibilityRoles: { select: { roleId: true } },
            participationEnabled: true,
            applicationRequired: true,
          },
        }),
      EventTemplateErrorMessage.NotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.EVENT_TEMPLATE_UPDATED_V3,
        /** The values after the change, also of the fields that stayed */
        data: {
          templateId: template.id,
          previousName: template.name,
          name: updatedTemplate.name,
          visibility: updatedTemplate.visibility,
          visibilityRoleIds: updatedTemplate.visibilityRoles.map(
            (visibilityRole) => visibilityRole.roleId,
          ),
          coverImageChanged,
          participationEnabled: updatedTemplate.participationEnabled,
          applicationRequired: updatedTemplate.applicationRequired,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      id: updatedTemplate.id,
      name: updatedTemplate.name,
      cover_image_changed: coverImageChanged,
    };
  });
