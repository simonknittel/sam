import {
  EventDiscordPublishTarget,
  EventSource,
} from "@sam-monorepo/database/browser";
import type { Event } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  eventContainerColumns,
  toEventContainer,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { EventErrorMessage } from "../events/eventErrors.js";
import { eventNameSchema } from "../events/eventInputSchemas.js";
import {
  requireManageableEvent,
  VISIBLE_EVENT_MANAGE_GUARD_SELECT,
} from "../events/eventManageGuard.js";
import { isAllowedToManageEvent } from "../events/eventManageRules.js";
import { getEventPageUrl } from "../events/eventUrl.js";
import { idSchema } from "../pagination.js";
import { COPYABLE_UPLOAD_SELECT } from "../uploads/uploadCopy.js";
import { withSpan } from "../withSpan.js";
import {
  createEventTemplateCopy,
  type EventTemplateCopyFields,
} from "./eventTemplateCopy.js";

export const createEventTemplateFromEventInputSchema = z.object({
  source_event_id: idSchema,
  name: eventNameSchema,
});

export type CreateEventTemplateFromEventInput = z.infer<
  typeof createEventTemplateFromEventInputSchema
>;

export interface CreateEventTemplateFromEventOutput {
  readonly id: string;
  readonly name: string;
}

/**
 * What the template stores so that an event created from it publishes itself
 * the same way the source event was published. Both columns NULL means the
 * source was never published, which prefills "do not publish". Keeping the
 * three fields in one object satisfies the CHECK constraint by construction
 * (see migration publish_events_to_discord).
 */
const toDiscordPublishPrefill = (
  context: Pick<ApplicationContext, "urls">,
  event: Pick<
    Event,
    "id" | "discordPublishedChannelId" | "discordPublishedLocation"
  >,
): Pick<
  EventTemplateCopyFields,
  "discordPublishTarget" | "discordPublishChannelId" | "discordPublishLocation"
> => {
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
       * URL, which the publication filled in and stored. Kept verbatim,
       * every event created from the template would point back at this
       * one — NULL is how the template says "the created event's own URL"
       * (see EventTemplate.discordPublishLocation).
       */
      discordPublishLocation:
        event.discordPublishedLocation ===
        getEventPageUrl(context.urls, event.id)
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
 * manager: core data, cover, visibility prefill, participation switch,
 * lineup and briefing carry over — the reverse direction of the template in `createEvent`.
 *
 * Managing the event is the gate, not merely seeing it: the briefing's
 * MANAGERS-scoped pages and a disabled lineup are readable inside the
 * resulting template, so anything less would hand them to every viewer with
 * `event;create`. An event that is over is a source too.
 */
export const createEventTemplateFromEvent = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateEventTemplateFromEventInput,
): Promise<CreateEventTemplateFromEventOutput> =>
  withSpan(context, "createEventTemplateFromEvent", async () => {
    /**
     * Authorize the request
     */
    requirePermission(actor, "event", "read");
    requirePermission(actor, "event", "create");
    const citizenId = requireCitizen(actor).id;

    /**
     * Only app events: a Discord event has its cover on Discord's CDN
     * without an `Upload` row of its own and carries no app briefing.
     */
    const sourceEvent = await context.prisma.event.findUnique({
      where: {
        id: input.source_event_id,
        source: EventSource.APP,
        deletedAt: null,
      },
      select: {
        ...VISIBLE_EVENT_MANAGE_GUARD_SELECT,
        name: true,
        description: true,
        coverImage: { select: COPYABLE_UPLOAD_SELECT },
        participationEnabled: true,
        discordPublishedChannelId: true,
        discordPublishedLocation: true,
      },
    });
    if (!sourceEvent) throw new NotFoundError(EventErrorMessage.NotFound);
    requireManageableEvent(
      context,
      actor,
      sourceEvent,
      isAllowedToManageEvent,
      {
        ignoreFreeze: true,
      },
    );

    const { template, positionCount, pageCount } =
      await createEventTemplateCopy(
        context,
        citizenId,
        {
          columns: eventContainerColumns(toEventContainer(sourceEvent.id)),
          coverImage: sourceEvent.coverImage,
          seedsMissingBriefingRoot: true,
        },
        {
          name: input.name,
          description: sourceEvent.description,
          visibility: sourceEvent.visibility,
          visibilityRoleIds: sourceEvent.visibilityRoles.map(
            (visibilityRole) => visibilityRole.roleId,
          ),
          participationEnabled: sourceEvent.participationEnabled,
          ...toDiscordPublishPrefill(context, sourceEvent),
        },
      );

    await context.audit.create([
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
        createdById: actor.userId,
      },
    ]);

    return template;
  });
