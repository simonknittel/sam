import {
  EventActivityType,
  EventSource,
  WikiPageEventScope,
} from "@sam-monorepo/database/browser";
import type { AuditEventInput } from "@sam-monorepo/domain";
import {
  AuditEventType,
  buildBriefingRootPageSeed,
  eventContainerColumns,
  toEventContainer,
  toTemplateContainer,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  DATE_TIME_INPUT_DESCRIPTION,
  dateTimeInputSchema,
} from "../dateTime.js";
import { ValidationError } from "../errors.js";
import {
  copyContainerContent,
  loadContainerCopySource,
  LONG_TRANSACTION_TIMEOUT_IN_MILLISECONDS,
} from "../eventTemplates/containerContentCopy.js";
import { requireReadableEventTemplate } from "../eventTemplates/eventTemplateAccess.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import {
  COPYABLE_UPLOAD_SELECT,
  copyUploadInTransaction,
} from "../uploads/uploadCopy.js";
import { withSpan } from "../withSpan.js";
import { requireOwnCoverImage } from "./coverImage.js";
import { createEventActivity } from "./eventActivity.js";
import { requireDescriptionFitsDiscord } from "./eventDescription.js";
import {
  createDiscordEventPublication,
  DiscordSyncOutcome,
  resolveDiscordPublishTarget,
  type DiscordSyncResult,
  type EventDiscordPublishRequest,
} from "./eventDiscordPublication.js";
import { EventErrorMessage } from "./eventErrors.js";
import {
  eventDescriptionSchema,
  eventNameSchema,
  eventVisibilitySchema,
  visibilityRoleIdsSchema,
} from "./eventInputSchemas.js";
import { toEventVisibility } from "./eventOutput.js";
import { resolveVisibilityRoleIds } from "./eventVisibilityRoles.js";
import { loadEventOutput, type GetEventOutput } from "./getEvent.js";

export const createEventInputSchema = z.object({
  name: eventNameSchema,
  description: eventDescriptionSchema.optional(),
  start_time: dateTimeInputSchema,
  end_time: dateTimeInputSchema.describe(
    `After start_time. ${DATE_TIME_INPUT_DESCRIPTION}`,
  ),
  visibility: eventVisibilitySchema,
  visibility_role_ids: visibilityRoleIdsSchema.optional(),
  participation_enabled: z
    .boolean()
    .optional()
    .describe(
      "False creates the event without sign-up and without lineup: nobody can sign up or be added. Default true (or the value of the template).",
    ),
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;

/**
 * The parts of a new event that only the app gives, not fields of the input
 * schema: the MCP server has no uploads, no templates and no Discord
 */
export interface CreateEventOptions {
  /** An image that the actor uploaded. The use case checks it. */
  readonly coverImageId?: string;
  /**
   * The template that the form was prefilled from. The new event gets a copy
   * of its lineup and its briefing.
   */
  readonly template?: {
    readonly templateId: string;
    /**
     * True when the new event gets a copy of the cover image of the
     * template. The template's cover is not an upload of the actor, thus it
     * cannot come as `coverImageId`.
     */
    readonly copiesCover: boolean;
  };
  /**
   * Publishes the new event to Discord after the creation. A failed
   * publication does not undo the creation.
   */
  readonly discordPublication?: EventDiscordPublishRequest;
}

export interface CreateEventOutput {
  readonly event: GetEventOutput;
  /**
   * False when the event is saved, but the notifications failed. The event
   * stands, thus the caller must not create it again.
   */
  readonly notifications_sent: boolean;
  /**
   * Only with the option `discordPublication`. The MCP tools parse the
   * output with a strict schema, thus the key must not exist without the
   * option.
   */
  readonly discord?: DiscordSyncResult;
}

/**
 * The template and everything that the new event copies from it. A
 * template whose root page was trashed has pages but no briefing to copy.
 *
 * @throws NotFoundError when the actor cannot read the template or it is
 * deleted: it can be deleted or unshared after the form loaded, and the id
 * is client input
 */
const loadTemplateCopySource = async (
  context: ApplicationContext,
  actor: Actor,
  { templateId, copiesCover }: NonNullable<CreateEventOptions["template"]>,
) => {
  const { template } = await requireReadableEventTemplate(
    context,
    actor,
    templateId,
    {
      select: {
        name: true,
        coverImage: { select: COPYABLE_UPLOAD_SELECT },
        participationEnabled: true,
      },
    },
  );

  const content = await loadContainerCopySource(
    context,
    eventContainerColumns(toTemplateContainer(template.id)),
  );
  const copiesBriefing = content.rootPage !== null;

  return {
    id: template.id,
    name: template.name,
    coverImage: copiesCover ? template.coverImage : null,
    participationEnabled: template.participationEnabled,
    content: copiesBriefing ? content : { ...content, briefingPages: [] },
    copiesBriefing,
    /**
     * True when the copied briefing is readable for more than the managers
     * from the first second. The publication is recorded with the creation,
     * thus a later scope change does not send the one-time "briefing
     * published" notification: the creation notification already announced
     * it.
     */
    isBriefingPublished:
      content.rootPage !== null &&
      content.rootPage.eventReadScope !== WikiPageEventScope.MANAGERS &&
      content.rootPage.eventReadScope !== WikiPageEventScope.INHERIT,
  };
};

/**
 * A channel that is gone counts as a failed publication: the event stands,
 * and the manager can publish it again from its settings. A failure cannot
 * undo the creation, thus a thrown error becomes Failed too: else the user
 * would create the event again.
 */
const publishCreatedEvent = async (
  context: ApplicationContext,
  actor: Actor,
  eventId: string,
  request: EventDiscordPublishRequest,
): Promise<DiscordSyncResult> => {
  try {
    const target = await resolveDiscordPublishTarget(context, request, eventId);
    if (!target) return { outcome: DiscordSyncOutcome.Failed };

    return await createDiscordEventPublication(context, eventId, target, actor);
  } catch (error) {
    context.log.error("Failed to publish a created event to Discord", {
      eventId,
      error,
    });
    return { outcome: DiscordSyncOutcome.Failed };
  }
};

/**
 * Creates an app event with its briefing root page (or the briefing of the
 * template) and notifies about it. The creator becomes its organizer.
 */
export const createEvent = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateEventInput,
  { coverImageId, template, discordPublication }: CreateEventOptions = {},
): Promise<CreateEventOutput> =>
  withSpan(context, "createEvent", async () => {
    requirePermission(actor, "event", "create");
    const citizenId = requireCitizen(actor).id;

    const startTime = input.start_time;
    const endTime = input.end_time;
    if (endTime <= startTime)
      throw new ValidationError(EventErrorMessage.EndBeforeStart);
    requireDescriptionFitsDiscord(context, input.description);

    const visibility = toEventVisibility(input.visibility);
    const visibilityRoleIds = await resolveVisibilityRoleIds(
      context,
      actor,
      visibility,
      input.visibility_role_ids ?? [],
    );

    if (coverImageId)
      await requireOwnCoverImage(context, citizenId, coverImageId);

    const templateSource = template
      ? await loadTemplateCopySource(context, actor, template)
      : null;

    /**
     * Create the event with its briefing and activity entry
     */
    const createdEvent = await context.prisma.$transaction(
      async (transaction) => {
        /**
         * The event gets its own copy of the template's cover, so editing or
         * deleting one never touches the other.
         */
        const copiedCoverImage = templateSource?.coverImage
          ? await copyUploadInTransaction(
              context,
              transaction,
              templateSource.coverImage,
              citizenId,
            )
          : null;

        const event = await transaction.event.create({
          data: {
            source: EventSource.APP,
            name: input.name,
            description: input.description || null,
            startTime,
            endTime,
            visibility,
            visibilityRoles: {
              create: visibilityRoleIds.map((roleId) => ({ roleId })),
            },
            /**
             * The form of the app prefills the value of the template, thus
             * the template only decides when the input has no value
             */
            participationEnabled:
              input.participation_enabled ??
              templateSource?.participationEnabled ??
              true,
            createdById: citizenId,
            coverImageId: coverImageId ?? copiedCoverImage?.id ?? null,
            briefingPublishedAt: templateSource?.isBriefingPublished
              ? context.now()
              : null,
            /**
             * A template brings its own briefing, copied below. An event
             * without a root page has no briefing and no way back to one.
             */
            ...(templateSource?.copiesBriefing
              ? {}
              : {
                  wikiPages: { create: buildBriefingRootPageSeed(citizenId) },
                }),
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (templateSource)
          await copyContainerContent(
            transaction,
            templateSource.content,
            toEventContainer(event.id),
            citizenId,
          );

        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId,
          type: EventActivityType.CREATED,
          payload: null,
        });

        return event;
      },
      { timeout: LONG_TRANSACTION_TIMEOUT_IN_MILLISECONDS },
    );

    const auditEvents: AuditEventInput[] = [
      {
        type: AuditEventType.EVENT_CREATED_IN_APP,
        data: {
          eventId: createdEvent.id,
          name: createdEvent.name,
        },
        createdById: actor.userId,
      },
    ];
    if (templateSource)
      auditEvents.push({
        type: AuditEventType.EVENT_CREATED_FROM_TEMPLATE,
        data: {
          eventId: createdEvent.id,
          templateId: templateSource.id,
          templateName: templateSource.name,
        },
        createdById: actor.userId,
      });
    await context.audit.create(auditEvents);

    const notificationsSent = await triggerNotificationsAfterSave(context, [
      { type: "EventCreated", payload: { eventId: createdEvent.id } },
    ]);

    /**
     * Outside the transaction: a Discord problem never undoes the created
     * event
     */
    const discord = discordPublication
      ? await publishCreatedEvent(
          context,
          actor,
          createdEvent.id,
          discordPublication,
        )
      : null;

    return {
      event: await loadEventOutput(context, actor, createdEvent.id),
      notifications_sent: notificationsSent,
      ...(discord ? { discord } : {}),
    };
  });
