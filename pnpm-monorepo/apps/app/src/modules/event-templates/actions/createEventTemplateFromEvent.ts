"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { EVENT_MANAGE_GUARD_SELECT } from "@/modules/events/queries/eventManageGuardSelect";
import {
  CLONABLE_POSITION_SELECT,
  clonePositions,
} from "@/modules/events/utils/clonePositions";
import { getDefaultExternalLocation } from "@/modules/events/utils/discordPublishing";
import {
  eventContainerColumns,
  toEventContainer,
  toTemplateContainer,
} from "@/modules/events/utils/eventContainer";
import { isAllowedToManageEvent } from "@/modules/events/utils/isAllowedToManageEvent";
import { buildPositionTree } from "@/modules/events/utils/positionTree";
import {
  COPYABLE_UPLOAD_SELECT,
  copyUpload,
} from "@/modules/uploads/utils/copyUpload";
import { getEventWikiContext } from "@/modules/wiki/queries/getEventWikiContext";
import { copyBriefingTree } from "@/modules/wiki/utils/copyBriefingTree";
import {
  EventDiscordPublishTarget,
  EventSource,
  type Event,
} from "@sam-monorepo/database/client";
import { buildBriefingRootPageSeed } from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  EVENT_TEMPLATE_NAME_MAX_LENGTH,
  EVENT_TEMPLATES_PATH,
  getEventTemplatePath,
} from "../utils/eventTemplateConstraints";

/** The briefing copy dominates the runtime — same bound the wiki copy uses */
const TRANSACTION_TIMEOUT_MS = 30_000;

const schema = z.object({
  /** `Event.id` is a cuid; the template ids of the sibling actions are cuid2 */
  sourceEventId: z.cuid(),
  name: z.string().trim().min(1).max(EVENT_TEMPLATE_NAME_MAX_LENGTH),
});

/**
 * What the template stores so that an event created from it publishes itself
 * the same way the source event was published. Both columns NULL means the
 * source was never published, which prefills "do not publish". Keeping the
 * three fields in one object satisfies the CHECK constraint by construction
 * (see migration publish_events_to_discord).
 */
const toDiscordPublishPrefill = (
  event: Pick<
    Event,
    "id" | "discordPublishedChannelId" | "discordPublishedLocation"
  >,
) => {
  if (event.discordPublishedChannelId)
    return {
      discordPublishTarget: EventDiscordPublishTarget.CHANNEL,
      discordPublishChannelId: event.discordPublishedChannelId,
      discordPublishLocation: null,
    };

  if (event.discordPublishedLocation)
    return {
      discordPublishTarget: EventDiscordPublishTarget.EXTERNAL,
      discordPublishChannelId: null,
      /**
       * A manager who left the location empty published to the event's own
       * URL, which `resolveDiscordPublishTarget` filled in and stored. Kept
       * verbatim, every event created from the template would point back at
       * this one — NULL is how the template says "the created event's own
       * URL" (see EventTemplate.discordPublishLocation).
       */
      discordPublishLocation:
        event.discordPublishedLocation === getDefaultExternalLocation(event.id)
          ? null
          : event.discordPublishedLocation,
    };

  return {
    discordPublishTarget: null,
    discordPublishChannelId: null,
    discordPublishLocation: null,
  };
};

/**
 * Turns a past or upcoming app event into a personal template of the acting
 * manager: core data, cover, visibility prefill, lineup and briefing carry
 * over — the reverse direction of the template branch in `createEvent`.
 *
 * Managing the event is the gate, not merely seeing it: the briefing's
 * MANAGERS-scoped pages and a disabled lineup are readable inside the
 * resulting template, so anything less would hand them to every viewer with
 * `event;create`.
 */
export const createEventTemplateFromEvent = createAuthenticatedAction(
  "createEventTemplateFromEvent",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!(await authentication.authorize("event", "read")))
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (!(await authentication.authorize("event", "create")))
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (!authentication.session.entity)
      return { error: t("Common.forbidden"), requestPayload: formData };
    const citizenId = authentication.session.entity.id;

    /**
     * Only app events: a Discord event has its cover on Discord's CDN
     * without an `Upload` row of its own and carries no app briefing.
     */
    const sourceEvent = await prisma.event.findUnique({
      where: {
        id: data.sourceEventId,
        source: EventSource.APP,
        deletedAt: null,
      },
      select: {
        ...EVENT_MANAGE_GUARD_SELECT,
        name: true,
        description: true,
        coverImageId: true,
        visibility: true,
        visibilityRoles: { select: { roleId: true } },
        discordPublishedChannelId: true,
        discordPublishedLocation: true,
      },
    });
    if (!sourceEvent)
      return { error: "Event nicht gefunden", requestPayload: formData };
    if (!(await isAllowedToManageEvent(sourceEvent)))
      return { error: t("Common.forbidden"), requestPayload: formData };

    const sourceContainer = toEventContainer(sourceEvent.id);

    const [sourcePositions, sourceBriefing, sourceCover] = await Promise.all([
      prisma.eventPosition.findMany({
        where: eventContainerColumns(sourceContainer),
        orderBy: { order: "asc" },
        select: CLONABLE_POSITION_SELECT,
      }),
      getEventWikiContext(sourceContainer),
      sourceEvent.coverImageId
        ? prisma.upload.findUnique({
            where: { id: sourceEvent.coverImageId },
            select: COPYABLE_UPLOAD_SELECT,
          })
        : Promise.resolve(null),
    ]);

    /**
     * Keyed on the root page, like `createEvent`: an event predating the
     * briefing feature has pages to copy but no root, and a template without
     * a root page has no briefing and no way back to one.
     */
    const copiesBriefing = (sourceBriefing?.rootPage ?? null) !== null;

    const { template, positionCount, pageCount } = await prisma.$transaction(
      async (transaction) => {
        /**
         * The template gets its own cover object, so editing or deleting one
         * never touches the other.
         */
        const coverImage = sourceCover
          ? await copyUpload(
              transaction,
              sourceCover,
              authentication.session.user.id,
            )
          : null;

        const created = await transaction.eventTemplate.create({
          data: {
            name: data.name,
            description: sourceEvent.description,
            coverImageId: coverImage?.id ?? null,
            visibility: sourceEvent.visibility,
            visibilityRoles: {
              create: sourceEvent.visibilityRoles.map(({ roleId }) => ({
                roleId,
              })),
            },
            ...toDiscordPublishPrefill(sourceEvent),
            createdById: citizenId,
            updatedById: citizenId,
            ownedById: citizenId,
            ...(copiesBriefing
              ? {}
              : {
                  wikiPages: { create: buildBriefingRootPageSeed(citizenId) },
                }),
          },
          select: { id: true, name: true },
        });

        const targetContainer = toTemplateContainer(created.id);

        const positionIdBySourceId = await clonePositions(
          transaction,
          buildPositionTree(sourcePositions),
          {
            container: targetContainer,
            parentPositionId: null,
            startOrder: 0,
          },
        );

        /**
         * Copied after the lineup, so the pages' POSITION scopes can be
         * remapped onto the template's own positions.
         */
        const briefing =
          sourceBriefing && copiesBriefing
            ? await copyBriefingTree(transaction, {
                sourcePages: sourceBriefing.pages,
                targetContainer,
                createdByEntityId: citizenId,
                positionIdBySourceId,
              })
            : { pageCount: 0 };

        return {
          template: created,
          positionCount: positionIdBySourceId.size,
          pageCount: briefing.pageCount,
        };
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_TEMPLATE_CREATED_FROM_EVENT,
        data: {
          templateId: template.id,
          name: template.name,
          sourceEventId: sourceEvent.id,
          sourceEventName: sourceEvent.name,
          positionCount,
          pageCount,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath(EVENT_TEMPLATES_PATH);

    redirect(getEventTemplatePath(template.id));
  },
);
