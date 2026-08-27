import "server-only";

import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { DiscordOutcome } from "@/modules/discord/utils/discordBotRequest";
import { getDiscordImageDataUri } from "@/modules/discord/utils/getDiscordImageDataUri";
import { getPublishableGuildChannels } from "@/modules/discord/utils/getPublishableGuildChannels";
import {
  DISCORD_EVENT_LOCATION_MAX_LENGTH,
  DISCORD_EVENT_NAME_MAX_LENGTH,
  findContentProblem,
  findPublishProblem,
  GuildScheduledEventContentProblem,
  type GuildScheduledEventContent,
  type GuildScheduledEventTarget,
} from "@/modules/discord/utils/guildScheduledEventPayload";
import {
  createGuildScheduledEvent,
  deleteGuildScheduledEvent,
  modifyGuildScheduledEvent,
} from "@/modules/discord/utils/guildScheduledEvents";
import { DiscordScheduledEventEntityType } from "@/modules/discord/utils/schemas";
import { log } from "@/modules/logging";
import { EventDiscordPublishTarget } from "@sam-monorepo/database/client";
import {
  buildDiscordEventDescription,
  EVENT_DESCRIPTION_MAX_LENGTH,
} from "./discordEventDescription";
import type { DiscordPublishFields } from "./discordPublishFields";
import { getEventUrl } from "./eventConstraints";

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
 * Read fresh for every Discord call instead of taken from the caller's own
 * query: the payload is built from more columns than any one mutation
 * touches (the cover in particular), and the app's row is the source of
 * truth for what Discord should show.
 */
const getPublishState = (eventId: string) =>
  prisma.event.findUnique({
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

const buildContent = async (event: PublishStateRow) => {
  if (!event.endTime) return null;

  /**
   * No cover means "clear it on Discord" (null); a cover that could not be
   * encoded means "leave Discord's alone" (undefined).
   */
  const imageDataUri = event.coverImage
    ? await getDiscordImageDataUri(event.coverImage)
    : null;

  return {
    content: {
      name: event.name,
      description: buildDiscordEventDescription(
        event.description,
        getEventUrl(event.id),
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
 * All five publish columns at once — the CHECK constraint rejects any
 * partial reset, so the two places that unpublish write the same set.
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
 * as gone, so the event can be published again.
 */
const clearPublishState = async (
  eventId: string,
  discordScheduledEventId: string,
) => {
  await prisma.event.update({
    where: { id: eventId },
    data: NO_PUBLICATION,
  });

  await createAuditEvents([
    {
      type: AuditEventType.EVENT_DISCORD_PUBLICATION_CLEARED,
      data: { eventId, discordScheduledEventId },
    },
  ]);
};

/**
 * The location an external event falls back to: the event's own page, which
 * is what a guild member reading the Discord entry actually wants.
 */
export const getDefaultExternalLocation = (eventId: string) =>
  getEventUrl(eventId);

/**
 * Turns the manager's choice into the shape Discord expects. A picked
 * channel is matched against the guild's own voice and stage channels —
 * the id arrives from the client, and Discord's entity type depends on the
 * channel's type — so an unknown or unusable channel resolves to null.
 */
export const resolveDiscordPublishTarget = async (
  fields: DiscordPublishFields & {
    readonly discordPublishTarget: EventDiscordPublishTarget;
  },
  eventId: string,
): Promise<GuildScheduledEventTarget | null> => {
  switch (fields.discordPublishTarget) {
    case EventDiscordPublishTarget.CHANNEL: {
      if (!fields.discordPublishChannelId) return null;

      const channels = await getPublishableGuildChannels();
      const channel = channels?.find(
        (candidate) => candidate.id === fields.discordPublishChannelId,
      );
      if (!channel) return null;

      return { entityType: channel.entityType, channelId: channel.id };
    }

    case EventDiscordPublishTarget.EXTERNAL:
      return {
        entityType: DiscordScheduledEventEntityType.External,
        location:
          fields.discordPublishLocation || getDefaultExternalLocation(eventId),
      };

    default:
      throw new Error(
        `Unknown target: ${fields.discordPublishTarget satisfies never}`,
      );
  }
};

interface Actor {
  readonly userId: string;
  readonly citizenId: string | null;
}

/**
 * Creates the guild scheduled event and records it on the app's event. The
 * caller has already authorized the request and validated the target.
 */
export const createDiscordEventPublication = async (
  eventId: string,
  target: GuildScheduledEventTarget,
  actor: Actor,
): Promise<DiscordSyncResult> => {
  const event = await getPublishState(eventId);
  if (!event) return { outcome: DiscordSyncOutcome.Skipped };
  if (event.discordPublishedId) return { outcome: DiscordSyncOutcome.Done };

  const built = await buildContent(event);
  if (!built)
    return {
      outcome: DiscordSyncOutcome.Rejected,
      problem: GuildScheduledEventContentProblem.MissingEndTime,
    };

  const problem = findPublishProblem(built.content, target, new Date());
  if (problem) return { outcome: DiscordSyncOutcome.Rejected, problem };

  const result = await createGuildScheduledEvent(built.content, target);
  if (result.outcome !== DiscordOutcome.Success)
    return { outcome: DiscordSyncOutcome.Failed };

  const isChannelTarget =
    target.entityType !== DiscordScheduledEventEntityType.External;

  /**
   * Conditional on the event still being unpublished: two managers hitting
   * publish at the same time would otherwise leave the loser's guild
   * scheduled event behind on Discord with nothing referencing it.
   */
  const { count } = await prisma.event.updateMany({
    where: { id: eventId, discordPublishedId: null },
    data: {
      discordPublishedId: result.data.id,
      discordPublishedAt: new Date(),
      discordPublishedById: actor.citizenId,
      discordPublishedChannelId: isChannelTarget ? target.channelId : null,
      discordPublishedLocation: isChannelTarget ? null : target.location,
    },
  });

  if (count === 0) {
    log.warn("Discarded a concurrently published guild scheduled event", {
      eventId,
      discordScheduledEventId: result.data.id,
    });
    await deleteGuildScheduledEvent(result.data.id);
    return { outcome: DiscordSyncOutcome.Done };
  }

  await createAuditEvents([
    {
      type: AuditEventType.EVENT_PUBLISHED_TO_DISCORD,
      data: {
        eventId,
        discordScheduledEventId: result.data.id,
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
 */
export const syncDiscordEventPublication = async (
  eventId: string,
): Promise<DiscordSyncResult> => {
  const event = await getPublishState(eventId);
  if (!event?.discordPublishedId)
    return { outcome: DiscordSyncOutcome.Skipped };

  const built = await buildContent(event);
  if (!built)
    return {
      outcome: DiscordSyncOutcome.Rejected,
      problem: GuildScheduledEventContentProblem.MissingEndTime,
    };

  const problem = findContentProblem(built.content);
  if (problem) return { outcome: DiscordSyncOutcome.Rejected, problem };

  const result = await modifyGuildScheduledEvent(
    event.discordPublishedId,
    built.content,
    new Date(),
  );

  if (result.outcome === DiscordOutcome.NotFound) {
    await clearPublishState(eventId, event.discordPublishedId);
    return { outcome: DiscordSyncOutcome.Cleared };
  }

  return result.outcome === DiscordOutcome.Success
    ? {
        outcome: DiscordSyncOutcome.Done,
        isCoverImageSkipped: built.isCoverImageSkipped,
      }
    : { outcome: DiscordSyncOutcome.Failed };
};

/**
 * Removes the guild scheduled event from Discord and clears the app's
 * publish state. An event Discord no longer knows counts as unpublished.
 */
export const removeDiscordEventPublication = async (
  eventId: string,
  actor: Actor,
): Promise<DiscordSyncResult> => {
  const event = await getPublishState(eventId);
  if (!event?.discordPublishedId)
    return { outcome: DiscordSyncOutcome.Skipped };

  const result = await deleteGuildScheduledEvent(event.discordPublishedId);

  if (result.outcome === DiscordOutcome.NotFound) {
    await clearPublishState(eventId, event.discordPublishedId);
    return { outcome: DiscordSyncOutcome.Cleared };
  }

  /**
   * The publish state stays put on a failure, so the manager can retry
   * instead of the app forgetting an event that is still live on Discord.
   */
  if (result.outcome !== DiscordOutcome.Success)
    return { outcome: DiscordSyncOutcome.Failed };

  await prisma.event.update({
    where: { id: eventId },
    data: NO_PUBLICATION,
  });

  await createAuditEvents([
    {
      type: AuditEventType.EVENT_UNPUBLISHED_FROM_DISCORD,
      data: { eventId, discordScheduledEventId: event.discordPublishedId },
      createdById: actor.userId,
    },
  ]);

  return { outcome: DiscordSyncOutcome.Done };
};

const getProblemMessage = (problem: GuildScheduledEventContentProblem) => {
  switch (problem) {
    case GuildScheduledEventContentProblem.MissingEndTime:
      return "Das Event braucht ein Ende, um auf Discord veröffentlicht werden zu können.";

    case GuildScheduledEventContentProblem.NameTooLong:
      return `Der Titel ist länger als die ${DISCORD_EVENT_NAME_MAX_LENGTH} Zeichen, die Discord erlaubt. Kürze ihn, um das Event auf Discord zu veröffentlichen.`;

    case GuildScheduledEventContentProblem.DescriptionTooLong:
      return `Die Kurzbeschreibung ist länger als die ${EVENT_DESCRIPTION_MAX_LENGTH.toLocaleString("de-DE")} Zeichen, die zusammen mit dem Hinweis zur Anmeldung auf Discord passen. Kürze sie, um das Event auf Discord zu veröffentlichen.`;

    case GuildScheduledEventContentProblem.LocationTooLong:
      return `Der Ort ist länger als die ${DISCORD_EVENT_LOCATION_MAX_LENGTH} Zeichen, die Discord erlaubt.`;

    case GuildScheduledEventContentProblem.StartInThePast:
      return "Discord akzeptiert nur Events, die in der Zukunft starten.";

    case GuildScheduledEventContentProblem.EndBeforeStart:
      return "Das Ende muss nach dem Start liegen.";

    default:
      throw new Error(`Unknown problem: ${problem satisfies never}`);
  }
};

/**
 * The message shown next to a successful app-side save whose Discord side
 * did not go through, or null when there is nothing to report.
 */
export const getDiscordSyncWarning = (result: DiscordSyncResult) => {
  switch (result.outcome) {
    case DiscordSyncOutcome.Skipped:
    case DiscordSyncOutcome.Done:
      return null;

    case DiscordSyncOutcome.Cleared:
      return "Das Event existiert auf Discord nicht mehr und gilt hier wieder als nicht veröffentlicht.";

    case DiscordSyncOutcome.Rejected:
      return `Discord wurde nicht aktualisiert: ${getProblemMessage(result.problem)}`;

    case DiscordSyncOutcome.Failed:
      return "Discord konnte nicht aktualisiert werden. Die Änderung wurde trotzdem gespeichert.";

    default:
      throw new Error(`Unknown outcome: ${result satisfies never}`);
  }
};

/**
 * Reported where the cover image is what the manager just acted on —
 * publishing, or replacing the cover. Deliberately not part of
 * `getDiscordSyncWarning`: an unsupported cover would otherwise nag on every
 * unrelated edit of the event.
 */
export const getDiscordCoverImageWarning = (result: DiscordSyncResult) =>
  result.outcome === DiscordSyncOutcome.Done && result.isCoverImageSkipped
    ? "Das Titelbild konnte nicht an Discord übertragen werden. Discord akzeptiert nur JPEG, PNG und GIF, und das Bild darf nicht zu groß sein."
    : null;

/** The error a failed publish is reported with, since nothing was saved. */
export const getDiscordPublishError = (result: DiscordSyncResult) => {
  switch (result.outcome) {
    case DiscordSyncOutcome.Skipped:
      return "Event nicht gefunden";

    case DiscordSyncOutcome.Rejected:
      return getProblemMessage(result.problem);

    case DiscordSyncOutcome.Failed:
      return "Discord konnte nicht erreicht werden. Versuche es später erneut.";

    case DiscordSyncOutcome.Done:
    case DiscordSyncOutcome.Cleared:
      return null;

    default:
      throw new Error(`Unknown outcome: ${result satisfies never}`);
  }
};
