import {
  EventDiscordPublishTarget,
  EventSource,
} from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  buildDiscordEventDescription,
  DISCORD_CHANNEL_ID_MAX_LENGTH,
  DISCORD_EVENT_LOCATION_MAX_LENGTH,
  DiscordScheduledEventEntityType,
  findContentProblem,
  findPublishProblem,
  GuildScheduledEventContentProblem,
  toGuildScheduledEventChange,
  type GuildScheduledEventContent,
  type GuildScheduledEventTarget,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import { DiscordOutcome, type ApplicationContext } from "../context.js";
import { callDiscord } from "../discord/callDiscord.js";
import { findPublishableDiscordChannels } from "../discord/publishableChannels.js";
import { ConflictError, NotFoundError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { readDiscordCoverImage } from "./discordCoverImage.js";
import { EventErrorMessage } from "./eventErrors.js";
import {
  requireManageableEvent,
  VISIBLE_EVENT_MANAGE_GUARD_SELECT,
} from "./eventManageGuard.js";
import { isAllowedToManageEvent } from "./eventManageRules.js";
import { getEventPageUrl } from "./eventUrl.js";

export enum DiscordSyncOutcome {
  /** The event is not published — nothing to do. */
  Skipped = "SKIPPED",
  Done = "DONE",
  /**
   * Discord had already forgotten the event, so the app dropped its own
   * publish state and the event can be published again.
   */
  Cleared = "CLEARED",
  /** The app's own content is not publishable; nothing was sent. */
  Rejected = "REJECTED",
  /** Discord could not be reached or refused the request. */
  Failed = "FAILED",
}

/** The result of a Discord step. Only the app reads it (camelCase keys). */
export type DiscordSyncResult =
  | { readonly outcome: DiscordSyncOutcome.Skipped }
  | {
      readonly outcome: DiscordSyncOutcome.Done;
      /**
       * The event has a cover the app could not hand to Discord (an
       * unsupported format, an oversized object, an unreachable bucket).
       * Everything else went through; Discord simply keeps whatever cover it
       * already had.
       */
      readonly isCoverImageSkipped?: boolean;
    }
  | { readonly outcome: DiscordSyncOutcome.Cleared }
  | {
      readonly outcome: DiscordSyncOutcome.Rejected;
      readonly problem: GuildScheduledEventContentProblem;
    }
  | { readonly outcome: DiscordSyncOutcome.Failed };

/**
 * The Discord target fields of the inputs that carry them: the publish, the
 * template and the form of a new event. An absent target means "do not
 * publish"; the publish narrows it to required.
 */
export const discordPublishFieldsShape = {
  discord_publish_target: z.enum(EventDiscordPublishTarget).optional(),
  /** The use case finds it in the channels of the guild */
  discord_publish_channel_id: z
    .string()
    .max(DISCORD_CHANNEL_ID_MAX_LENGTH)
    .optional(),
  discord_publish_location: z
    .string()
    .trim()
    .max(DISCORD_EVENT_LOCATION_MAX_LENGTH)
    .optional(),
};

/** Where the manager wants the Discord event, as the forms of the app give it */
export interface EventDiscordPublishRequest {
  readonly target: EventDiscordPublishTarget;
  /**
   * The channel of a CHANNEL target. It comes from the client, thus the use
   * case finds it in the channels of the guild.
   */
  readonly channelId?: string;
  /** The location of an EXTERNAL target. Without it, the page of the event. */
  readonly location?: string;
}

export const publishEventToDiscordInputSchema = z.object({
  event_id: idSchema,
  ...discordPublishFieldsShape,
  discord_publish_target: z.enum(EventDiscordPublishTarget),
});

export type PublishEventToDiscordInput = z.infer<
  typeof publishEventToDiscordInputSchema
>;

export const unpublishEventFromDiscordInputSchema = z.object({
  event_id: idSchema,
});

export type UnpublishEventFromDiscordInput = z.infer<
  typeof unpublishEventFromDiscordInputSchema
>;

/**
 * Read fresh for every Discord call instead of taken from the caller's own
 * query: the payload is built from more columns than any one mutation
 * touches (the cover in particular), and the app's row is the source of
 * truth for what Discord should show.
 */
const getPublishState = (context: ApplicationContext, eventId: string) =>
  context.prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      description: true,
      startTime: true,
      endTime: true,
      discordPublishedId: true,
      coverImage: { select: { id: true, mimeType: true } },
    },
  });

type PublishStateRow = NonNullable<Awaited<ReturnType<typeof getPublishState>>>;

const buildContent = async (
  context: ApplicationContext,
  event: PublishStateRow,
) => {
  if (!event.endTime) return null;

  /**
   * No cover means "clear it on Discord" (null); a cover that could not be
   * encoded means "leave Discord's alone" (undefined).
   */
  const imageDataUri = event.coverImage
    ? await readDiscordCoverImage(context, event.coverImage)
    : null;

  return {
    content: {
      name: event.name,
      description: buildDiscordEventDescription(
        event.description,
        getEventPageUrl(context.urls, event.id),
      ),
      startTime: event.startTime,
      endTime: event.endTime,
      imageDataUri,
    } satisfies GuildScheduledEventContent,
    isCoverImageSkipped:
      event.coverImage !== null && imageDataUri === undefined,
  };
};

/**
 * All five publish columns at once — the CHECK constraint rejects a reset of
 * the id without the channel and the location, so the two places that
 * unpublish write the same set.
 */
const NO_PUBLICATION = {
  discordPublishedId: null,
  discordPublishedAt: null,
  discordPublishedById: null,
  discordPublishedChannelId: null,
  discordPublishedLocation: null,
} as const;

/**
 * Drops the publish state after Discord reported the guild scheduled event
 * as gone, so the event can be published again. Nobody caused it, thus the
 * audit event has no creator.
 */
const clearPublishState = async (
  context: ApplicationContext,
  eventId: string,
  discordScheduledEventId: string,
) => {
  await context.prisma.event.update({
    where: { id: eventId },
    data: NO_PUBLICATION,
  });

  await context.audit.create([
    {
      type: AuditEventType.EVENT_DISCORD_PUBLICATION_CLEARED,
      data: { eventId, discordScheduledEventId },
      createdById: null,
    },
  ]);
};

/**
 * Turns the manager's choice into the shape Discord expects. A picked
 * channel is matched against the guild's own voice and stage channels —
 * the id arrives from the client, and Discord's entity type depends on the
 * channel's type — so an unknown or unusable channel resolves to null, and
 * so does a channel target when Discord cannot be reached.
 */
export const resolveDiscordPublishTarget = async (
  context: ApplicationContext,
  request: EventDiscordPublishRequest,
  eventId: string,
): Promise<GuildScheduledEventTarget | null> => {
  switch (request.target) {
    case EventDiscordPublishTarget.CHANNEL: {
      if (!request.channelId) return null;

      const channels = await findPublishableDiscordChannels(context);
      const channel = channels?.find(
        (candidate) => candidate.id === request.channelId,
      );
      if (!channel) return null;

      return { entityType: channel.entityType, channelId: channel.id };
    }

    case EventDiscordPublishTarget.EXTERNAL:
      return {
        entityType: DiscordScheduledEventEntityType.External,
        location: request.location || getEventPageUrl(context.urls, eventId),
      };

    default:
      throw new Error(`Unknown target: ${request.target satisfies never}`);
  }
};

/**
 * Creates the guild scheduled event and records it on the app's event. The
 * caller has already authorized the request and validated the target.
 */
export const createDiscordEventPublication = async (
  context: ApplicationContext,
  eventId: string,
  target: GuildScheduledEventTarget,
  actor: Actor,
): Promise<DiscordSyncResult> => {
  const event = await getPublishState(context, eventId);
  if (!event) return { outcome: DiscordSyncOutcome.Skipped };
  if (event.discordPublishedId) return { outcome: DiscordSyncOutcome.Done };

  const built = await buildContent(context, event);
  if (!built)
    return {
      outcome: DiscordSyncOutcome.Rejected,
      problem: GuildScheduledEventContentProblem.MissingEndTime,
    };

  const problem = findPublishProblem(built.content, target, context.now());
  if (problem) return { outcome: DiscordSyncOutcome.Rejected, problem };

  const result = await callDiscord(context, (gateway) =>
    gateway.createScheduledEvent(built.content, target),
  );
  if (result.outcome !== DiscordOutcome.Success)
    return { outcome: DiscordSyncOutcome.Failed };
  const discordScheduledEventId = result.data.id;

  const isChannelTarget =
    target.entityType !== DiscordScheduledEventEntityType.External;

  /**
   * Conditional on the event still being unpublished and not deleted: two
   * managers hitting publish at the same time, or a delete during the
   * publish, would otherwise leave the guild scheduled event behind on
   * Discord with nothing referencing it.
   */
  const { count } = await context.prisma.event.updateMany({
    where: { id: eventId, discordPublishedId: null, deletedAt: null },
    data: {
      discordPublishedId: discordScheduledEventId,
      discordPublishedAt: context.now(),
      discordPublishedById: actor.citizen?.id ?? null,
      discordPublishedChannelId: isChannelTarget ? target.channelId : null,
      discordPublishedLocation: isChannelTarget ? null : target.location,
    },
  });

  if (count === 0) {
    context.log.warn(
      "Discarded a guild scheduled event of a concurrently published or deleted event",
      { eventId, discordScheduledEventId },
    );
    await callDiscord(context, (gateway) =>
      gateway.deleteScheduledEvent(discordScheduledEventId),
    );
    return { outcome: DiscordSyncOutcome.Done };
  }

  await context.audit.create([
    {
      type: AuditEventType.EVENT_PUBLISHED_TO_DISCORD,
      data: {
        eventId,
        discordScheduledEventId,
        discordChannelId: isChannelTarget ? target.channelId : null,
      },
      createdById: actor.userId,
    },
  ]);

  return {
    outcome: DiscordSyncOutcome.Done,
    isCoverImageSkipped: built.isCoverImageSkipped,
  };
};

/**
 * Re-asserts the app's title, description, schedule and cover on an already
 * published event. A no-op for events that were never published, so every
 * mutation path can call it unconditionally.
 *
 * No permission check: the callers (`updateEvent` and
 * `assignEventCoverImage`) check that the actor can manage the event.
 */
export const syncEventDiscordPublication = (
  context: ApplicationContext,
  eventId: string,
): Promise<DiscordSyncResult> =>
  withSpan(context, "syncEventDiscordPublication", async () => {
    const event = await getPublishState(context, eventId);
    const discordScheduledEventId = event?.discordPublishedId;
    if (!event || !discordScheduledEventId)
      return { outcome: DiscordSyncOutcome.Skipped };

    const built = await buildContent(context, event);
    if (!built)
      return {
        outcome: DiscordSyncOutcome.Rejected,
        problem: GuildScheduledEventContentProblem.MissingEndTime,
      };

    const problem = findContentProblem(built.content);
    if (problem) return { outcome: DiscordSyncOutcome.Rejected, problem };

    const result = await callDiscord(context, (gateway) =>
      gateway.modifyScheduledEvent(
        discordScheduledEventId,
        toGuildScheduledEventChange(built.content, context.now()),
      ),
    );

    switch (result.outcome) {
      case DiscordOutcome.Success:
        return {
          outcome: DiscordSyncOutcome.Done,
          isCoverImageSkipped: built.isCoverImageSkipped,
        };

      case DiscordOutcome.NotFound:
        await clearPublishState(context, eventId, discordScheduledEventId);
        return { outcome: DiscordSyncOutcome.Cleared };

      case DiscordOutcome.Failed:
        return { outcome: DiscordSyncOutcome.Failed };

      default:
        throw new Error(`Unknown outcome: ${result satisfies never}`);
    }
  });

/**
 * Removes the guild scheduled event from Discord and clears the app's
 * publish state. An event Discord no longer knows counts as unpublished.
 */
export const removeEventDiscordPublication = async (
  context: ApplicationContext,
  eventId: string,
  actor: Actor,
): Promise<DiscordSyncResult> => {
  const event = await getPublishState(context, eventId);
  const discordScheduledEventId = event?.discordPublishedId;
  if (!discordScheduledEventId) return { outcome: DiscordSyncOutcome.Skipped };

  const result = await callDiscord(context, (gateway) =>
    gateway.deleteScheduledEvent(discordScheduledEventId),
  );

  if (result.outcome === DiscordOutcome.NotFound) {
    await clearPublishState(context, eventId, discordScheduledEventId);
    return { outcome: DiscordSyncOutcome.Cleared };
  }

  /**
   * The publish state stays put on a failure, so the manager can retry
   * instead of the app forgetting an event that is still live on Discord.
   */
  if (result.outcome !== DiscordOutcome.Success)
    return { outcome: DiscordSyncOutcome.Failed };

  await context.prisma.event.update({
    where: { id: eventId },
    data: NO_PUBLICATION,
  });

  await context.audit.create([
    {
      type: AuditEventType.EVENT_UNPUBLISHED_FROM_DISCORD,
      data: { eventId, discordScheduledEventId },
      createdById: actor.userId,
    },
  ]);

  return { outcome: DiscordSyncOutcome.Done };
};

/**
 * The app event of a publish or an unpublish. Publishing is part of
 * managing an event, so it needs no permission of its own.
 *
 * @throws NotFoundError, ConflictError or ForbiddenError (see
 * `requireManageableEvent()`)
 */
const requirePublishableEvent = async (
  context: ApplicationContext,
  actor: Actor,
  eventId: string,
) => {
  const event = await context.prisma.event.findUnique({
    where: {
      id: eventId,
      source: EventSource.APP,
      deletedAt: null,
    },
    select: {
      ...VISIBLE_EVENT_MANAGE_GUARD_SELECT,
      discordPublishedId: true,
    },
  });
  if (!event) throw new NotFoundError(EventErrorMessage.NotFound);
  requireManageableEvent(context, actor, event, isAllowedToManageEvent);

  return event;
};

/**
 * Publishes an app event as a guild scheduled event on Discord. Only the
 * app calls it: the result tells which Discord step failed, and a rejected
 * or failed publish changes nothing.
 *
 * @throws ConflictError `EventErrorMessage.AlreadyPublishedOnDiscord`, and
 * ValidationError `EventErrorMessage.DiscordChannelUnavailable`
 */
export const publishEventToDiscord = (
  context: ApplicationContext,
  actor: Actor,
  input: PublishEventToDiscordInput,
): Promise<DiscordSyncResult> =>
  withSpan(context, "publishEventToDiscord", async () => {
    const event = await requirePublishableEvent(context, actor, input.event_id);
    if (event.discordPublishedId)
      throw new ConflictError(EventErrorMessage.AlreadyPublishedOnDiscord);

    const target = await resolveDiscordPublishTarget(
      context,
      {
        target: input.discord_publish_target,
        channelId: input.discord_publish_channel_id,
        location: input.discord_publish_location,
      },
      event.id,
    );
    if (!target)
      throw new ValidationError(EventErrorMessage.DiscordChannelUnavailable);

    return createDiscordEventPublication(context, event.id, target, actor);
  });

/**
 * Removes the guild scheduled event of an app event from Discord. Only the
 * app calls it. A failed removal keeps the publish state, thus the manager
 * can try again.
 */
export const unpublishEventFromDiscord = (
  context: ApplicationContext,
  actor: Actor,
  input: UnpublishEventFromDiscordInput,
): Promise<DiscordSyncResult> =>
  withSpan(context, "unpublishEventFromDiscord", async () => {
    const event = await requirePublishableEvent(context, actor, input.event_id);

    return removeEventDiscordPublication(context, event.id, actor);
  });
