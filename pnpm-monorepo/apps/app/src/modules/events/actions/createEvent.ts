"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { probeUploadImageDimensions } from "@/modules/common/utils/probeUploadImageDimensions";
import { DISCORD_EVENT_DESCRIPTION_MAX_LENGTH } from "@/modules/discord/utils/guildScheduledEventPayload";
import { getEventTemplateById } from "@/modules/event-templates/queries/getEventTemplateById";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import {
  COPYABLE_UPLOAD_SELECT,
  copyUpload,
} from "@/modules/uploads/utils/copyUpload";
import { getEventWikiContext } from "@/modules/wiki/queries/getEventWikiContext";
import { copyBriefingTree } from "@/modules/wiki/utils/copyBriefingTree";
import {
  EventActivityType,
  EventSource,
  EventVisibility,
  WikiPageEventScope,
} from "@sam-monorepo/database/client";
import type { AuditEventInput } from "@sam-monorepo/domain";
import { buildBriefingRootPageSeed } from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { berlinWallTimeToUtc } from "../utils/berlinWallTime";
import {
  CLONABLE_POSITION_SELECT,
  clonePositions,
} from "../utils/clonePositions";
import { findDescriptionProblem } from "../utils/discordEventDescription";
import {
  discordPublishFieldsSchema,
  parseDiscordPublishFields,
} from "../utils/discordPublishFields";
import {
  createDiscordEventPublication,
  DiscordSyncOutcome,
  resolveDiscordPublishTarget,
} from "../utils/discordPublishing";
import { createEventActivity } from "../utils/eventActivity";
import {
  DISCORD_PUBLISH_FAILED_PARAM,
  EVENT_MAX_VISIBILITY_ROLES,
  EVENT_NAME_MAX_LENGTH,
  getEventPath,
} from "../utils/eventConstraints";
import {
  eventContainerColumns,
  toEventContainer,
  toTemplateContainer,
} from "../utils/eventContainer";
import { buildPositionTree } from "../utils/positionTree";

const WALL_TIME_SCHEMA = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Ungültiges Datum");

/** The briefing copy dominates the runtime — same bound the wiki copy uses */
const TRANSACTION_TIMEOUT_MS = 30_000;

const schema = z.object({
  name: z.string().trim().min(1).max(EVENT_NAME_MAX_LENGTH),
  /** See `updateEvent` for why this is Discord's limit and not the app's. */
  description: z
    .string()
    .trim()
    .max(DISCORD_EVENT_DESCRIPTION_MAX_LENGTH)
    .optional(),
  startTime: WALL_TIME_SCHEMA,
  endTime: WALL_TIME_SCHEMA,
  visibility: z.enum(EventVisibility),
  visibilityRoleIds: z
    .array(z.cuid())
    .max(EVENT_MAX_VISIBILITY_ROLES)
    .optional(),
  coverImageId: z.cuid().optional(),
  /** Set when the form was prefilled from a template (see the picker) */
  templateId: z.cuid2().optional(),
  /**
   * The prefilled cover comes from the template and is not an upload of the
   * submitter's own, so it travels as this flag instead of an upload id.
   */
  keepTemplateCover: z.boolean().optional(),
  /**
   * Publishes the new event to Discord right after creation. Absent means
   * "do not publish"; a template's preference reaches the action by
   * prefilling these fields, so clearing them in the form still wins.
   */
  ...discordPublishFieldsSchema.shape,
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

    const descriptionProblem = findDescriptionProblem(data.description);
    if (descriptionProblem)
      return { error: descriptionProblem, requestPayload: formData };

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
        return {
          error: "Ungültiges Titelbild",
          requestPayload: formData,
        };
    }

    /**
     * Re-check the template at action time: it may have been deleted or
     * unshared since the form loaded, and the id itself is client input.
     */
    const template = data.templateId
      ? await getEventTemplateById(data.templateId)
      : null;
    if (data.templateId && template?.template.deletedAt !== null)
      return {
        error: "Vorlage nicht gefunden",
        requestPayload: formData,
      };

    const templateContainer = template
      ? toTemplateContainer(template.template.id)
      : null;

    const [templatePositions, templateBriefing, templateCover] =
      templateContainer
        ? await Promise.all([
            prisma.eventPosition.findMany({
              where: eventContainerColumns(templateContainer),
              orderBy: { order: "asc" },
              select: CLONABLE_POSITION_SELECT,
            }),
            getEventWikiContext(templateContainer),
            data.keepTemplateCover &&
            !data.coverImageId &&
            template?.template.coverImageId
              ? prisma.upload.findUnique({
                  where: { id: template.template.coverImageId },
                  select: COPYABLE_UPLOAD_SELECT,
                })
              : Promise.resolve(null),
          ])
        : [[], null, null];

    const copiedRootPage = templateBriefing?.rootPage ?? null;
    const copiesBriefing = copiedRootPage !== null;
    /**
     * A template whose briefing root already left the managers produces an
     * event whose briefing is readable from the first second. Recording
     * that as the publication keeps a later scope change from firing the
     * one-time "briefing published" notification long after the fact —
     * the event's own creation notification already announced it.
     */
    const briefingPublishedAt =
      copiedRootPage &&
      copiedRootPage.eventReadScope !== WikiPageEventScope.MANAGERS &&
      copiedRootPage.eventReadScope !== WikiPageEventScope.INHERIT
        ? new Date()
        : null;

    /**
     * Create the event with its briefing and activity entry
     */
    const createdEvent = await prisma.$transaction(
      async (transaction) => {
        /**
         * The event gets its own copy of the template's cover, so editing or
         * deleting one never touches the other.
         */
        const copiedCover = templateCover
          ? await copyUpload(
              transaction,
              templateCover,
              authentication.session.user.id,
            )
          : null;

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
            coverImageId: data.coverImageId ?? copiedCover?.id ?? null,
            briefingPublishedAt,
            /**
             * A template brings its own briefing, copied below. Keyed on the
             * root page, not on the context: a template whose root was
             * trashed has a context but nothing to copy, and an event
             * without a root page has no briefing and no way back to one.
             */
            ...(copiesBriefing
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

        if (templateContainer) {
          const positionIdBySourceId = await clonePositions(
            transaction,
            buildPositionTree(templatePositions),
            {
              container: toEventContainer(event.id),
              parentPositionId: null,
              startOrder: 0,
            },
          );

          /**
           * Copied after the lineup, so the pages' POSITION scopes can be
           * remapped onto the event's own positions.
           */
          if (templateBriefing && copiesBriefing)
            await copyBriefingTree(transaction, {
              sourcePages: templateBriefing.pages,
              targetContainer: toEventContainer(event.id),
              createdByEntityId: citizenId,
              positionIdBySourceId,
            });
        }

        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId,
          type: EventActivityType.CREATED,
          payload: null,
        });

        return event;
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );

    if (data.coverImageId) probeUploadImageDimensions(data.coverImageId);

    const auditEvents: AuditEventInput[] = [
      {
        type: AuditEventType.EVENT_CREATED_IN_APP,
        data: {
          eventId: createdEvent.id,
          name: createdEvent.name,
        },
        createdById: authentication.session.user.id,
      },
    ];
    if (template)
      auditEvents.push({
        type: AuditEventType.EVENT_CREATED_FROM_TEMPLATE,
        data: {
          eventId: createdEvent.id,
          templateId: template.template.id,
          templateName: template.template.name,
        },
        createdById: authentication.session.user.id,
      });
    await createAuditEvents(auditEvents);

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
     * Publish to Discord if the form (or the template it was prefilled from)
     * asked for it. A failure never undoes the created event — the manager
     * is told on the event page and can retry from its settings.
     */
    let publishFailed = false;
    if (data.discordPublishTarget) {
      const target = await resolveDiscordPublishTarget(
        { ...data, discordPublishTarget: data.discordPublishTarget },
        createdEvent.id,
      );

      const result = target
        ? await createDiscordEventPublication(createdEvent.id, target, {
            userId: authentication.session.user.id,
            citizenId,
          })
        : null;
      publishFailed = result?.outcome !== DiscordSyncOutcome.Done;
    }

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/events");
    revalidatePath("/app/dashboard");

    /**
     * Redirect to the created event; the form's success hook closes the
     * modal while the navigation is in flight (see useAction).
     */
    redirect(
      publishFailed
        ? `${getEventPath(createdEvent.id)}?${DISCORD_PUBLISH_FAILED_PARAM}=1`
        : getEventPath(createdEvent.id),
    );
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
      templateId: formData.get("templateId") || undefined,
      keepTemplateCover: formData.get("keepTemplateCover") === "1",
      ...parseDiscordPublishFields(formData),
    }),
  },
);
