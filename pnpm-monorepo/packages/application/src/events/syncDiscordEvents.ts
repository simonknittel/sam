import { EventSource } from "@sam-monorepo/database/browser";
import {
  ACTIVE_CITIZEN_WHERE,
  AuditEventType,
  buildBriefingRootPageSeed,
} from "@sam-monorepo/domain";
import {
  DiscordOutcome,
  type ApplicationContext,
  type DiscordScheduledEvent,
} from "../context.js";
import { callDiscord } from "../discord/callDiscord.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";
import { deleteCancelledDiscordEvents } from "./deleteCancelledDiscordEvents.js";
import { excludeAppPublishedEvents } from "./discordEventReconciliation.js";
import { buildEventChangeNotifications } from "./eventChangeNotifications.js";
import { syncDiscordParticipants } from "./syncDiscordParticipants.js";

export interface SyncDiscordEventsOutput {
  /** The scheduled events that Discord gave */
  readonly fetchedEventCount: number;
  /** The scheduled events that the app published itself */
  readonly skippedPublishedEventCount: number;
  /** The future events that are no longer on Discord */
  readonly deletedEventCount: number;
  readonly createdEventCount: number;
  readonly updatedEventCount: number;
  /** The existing events that got the citizen of their Discord creator */
  readonly linkedCreatorCount: number;
  /** The existing events that got their missing briefing root page */
  readonly seededBriefingCount: number;
  readonly addedParticipantCount: number;
  readonly removedParticipantCount: number;
  /** The participation rows that got the citizen of their Discord user */
  readonly linkedParticipantCount: number;
  readonly notificationsSent: boolean;
}

enum EventReconciliation {
  Created = "CREATED",
  Updated = "UPDATED",
  Unchanged = "UNCHANGED",
}

interface ReconcileDiscordEventOutput {
  readonly reconciliation: EventReconciliation;
  readonly linkedCreator: boolean;
  readonly seededBriefing: boolean;
  readonly notificationsSent: boolean;
}

/** The guild scheduled event ids that the app owns at the time of the read */
const findAppPublishedDiscordIds = async (context: ApplicationContext) => {
  const events = await context.prisma.event.findMany({
    where: { discordPublishedId: { not: null } },
    select: { discordPublishedId: true },
  });

  return events.flatMap((event) =>
    event.discordPublishedId === null ? [] : [event.discordPublishedId],
  );
};

/**
 * Gives the id of the active citizen of a Discord user (for example of the
 * creator of a scheduled event), or null.
 */
const findCitizenIdByDiscordId = async (
  context: ApplicationContext,
  discordId: string | null,
) => {
  if (discordId === null) return null;

  const citizen = await context.prisma.citizen.findFirst({
    where: {
      discordId,
      ...ACTIVE_CITIZEN_WHERE,
    },
    select: {
      id: true,
    },
  });

  return citizen?.id ?? null;
};

/** A copy of the items in a random order (the Fisher–Yates shuffle) */
const shuffle = <Item>(items: readonly Item[]): Item[] => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const otherIndex = Math.floor(Math.random() * (index + 1));
    const item = shuffled[index]!;
    shuffled[index] = shuffled[otherIndex]!;
    shuffled[otherIndex] = item;
  }

  return shuffled;
};

const importDiscordEvent = async (
  context: ApplicationContext,
  scheduledEvent: DiscordScheduledEvent,
): Promise<ReconcileDiscordEventOutput> => {
  const createdById = await findCitizenIdByDiscordId(
    context,
    scheduledEvent.creatorId,
  );

  const event = await context.prisma.event.create({
    data: {
      source: EventSource.DISCORD,
      discordId: scheduledEvent.id,
      discordCreatorId: scheduledEvent.creatorId,
      createdById,
      name: scheduledEvent.name,
      startTime: scheduledEvent.startTime,
      endTime: scheduledEvent.endTime,
      description: scheduledEvent.description,
      location: scheduledEvent.location,
      discordImage: scheduledEvent.image,
      discordGuildId: scheduledEvent.guildId,
      wikiPages: {
        create: buildBriefingRootPageSeed(createdById),
      },
    },
    select: {
      id: true,
    },
  });

  await context.audit.create([
    {
      type: AuditEventType.EVENT_IMPORTED_FROM_DISCORD,
      data: {
        eventId: event.id,
        discordId: scheduledEvent.id,
        name: scheduledEvent.name,
      },
      createdById: null,
    },
  ]);

  const notificationsSent = await triggerNotificationsAfterSave(context, [
    { type: "EventCreated", payload: { eventId: event.id } },
  ]);

  return {
    reconciliation: EventReconciliation.Created,
    linkedCreator: false,
    seededBriefing: false,
    notificationsSent,
  };
};

/**
 * Creates the event of a new scheduled event, or copies the changes of
 * Discord into the existing event.
 */
const reconcileDiscordEvent = async (
  context: ApplicationContext,
  scheduledEvent: DiscordScheduledEvent,
): Promise<ReconcileDiscordEventOutput> => {
  const existingEvent = await context.prisma.event.findUnique({
    where: {
      discordId: scheduledEvent.id,
    },
    select: {
      id: true,
      name: true,
      startTime: true,
      endTime: true,
      description: true,
      location: true,
      discordImage: true,
      discordCreatorId: true,
      createdById: true,
      wikiPages: {
        where: {
          parentId: null,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });
  if (!existingEvent) return importDiscordEvent(context, scheduledEvent);

  /** A change of only the image sends no notification */
  const notifications = buildEventChangeNotifications(existingEvent.id, {
    startTime:
      existingEvent.startTime.getTime() !== scheduledEvent.startTime.getTime(),
    endTime:
      existingEvent.endTime?.getTime() !== scheduledEvent.endTime?.getTime(),
    details:
      existingEvent.name !== scheduledEvent.name ||
      existingEvent.description !== scheduledEvent.description ||
      existingEvent.location !== scheduledEvent.location,
  });
  const hasChange =
    notifications.length > 0 ||
    existingEvent.discordImage !== scheduledEvent.image;

  if (hasChange) {
    await context.prisma.event.update({
      where: {
        id: existingEvent.id,
      },
      data: {
        name: scheduledEvent.name,
        startTime: scheduledEvent.startTime,
        endTime: scheduledEvent.endTime,
        description: scheduledEvent.description,
        location: scheduledEvent.location,
        discordImage: scheduledEvent.image,
      },
      select: {
        id: true,
      },
    });

    await context.audit.create([
      {
        type: AuditEventType.EVENT_UPDATED_FROM_DISCORD,
        data: {
          eventId: existingEvent.id,
          discordId: scheduledEvent.id,
          name: scheduledEvent.name,
        },
        createdById: null,
      },
    ]);
  }

  const notificationsSent =
    notifications.length > 0
      ? await triggerNotificationsAfterSave(context, notifications)
      : true;

  /**
   * The citizen of the Discord creator can come after the import of the
   * event. Thus each run looks for it again.
   */
  let linkedCreator = false;
  if (existingEvent.createdById === null) {
    const createdById = await findCitizenIdByDiscordId(
      context,
      existingEvent.discordCreatorId,
    );

    if (createdById) {
      await context.prisma.event.update({
        where: {
          id: existingEvent.id,
        },
        data: {
          createdById,
        },
        select: {
          id: true,
        },
      });
      linkedCreator = true;
    }
  }

  const seededBriefing = existingEvent.wikiPages.length === 0;
  if (seededBriefing) {
    await context.prisma.wikiPage.create({
      data: {
        ...buildBriefingRootPageSeed(
          await findCitizenIdByDiscordId(
            context,
            existingEvent.discordCreatorId,
          ),
        ),
        eventId: existingEvent.id,
      },
    });
  }

  return {
    reconciliation: hasChange
      ? EventReconciliation.Updated
      : EventReconciliation.Unchanged,
    linkedCreator,
    seededBriefing,
    notificationsSent,
  };
};

/**
 * Copies the scheduled events of the guild into the events from Discord:
 * it deletes the cancelled events, creates the new events, updates the
 * changed events and syncs their participants. A failed read from Discord
 * stops the run.
 */
export const syncDiscordEvents = (
  context: ApplicationContext,
): Promise<SyncDiscordEventsOutput> =>
  withSpan(context, "syncDiscordEvents", async () => {
    /**
     * The sync ignores each scheduled event that the app published itself:
     * those events are app rows in the database already, and the app keeps
     * them up to date from its side.
     *
     * The sync reads the published ids before and after the fetch and uses
     * both reads, because each order alone loses a race. An event that the
     * app publishes after the read would not be excluded. An event that the
     * app unpublishes after the read would be excluded by a later read, but
     * the fetch gave it already. In both cases the sync would import a
     * duplicate. In the second case the participant sync would also read a
     * scheduled event that does not exist, and stop the run.
     */
    const publishedIdsBeforeFetch = await findAppPublishedDiscordIds(context);
    const fetchResult = await callDiscord(context, (gateway) =>
      gateway.listScheduledEvents(),
    );
    if (fetchResult.outcome !== DiscordOutcome.Success)
      throw new Error("Failed to read the scheduled events from Discord");
    const publishedIdsAfterFetch = await findAppPublishedDiscordIds(context);

    const ownScheduledEvents = excludeAppPublishedEvents(
      fetchResult.data,
      new Set([...publishedIdsBeforeFetch, ...publishedIdsAfterFetch]),
    );

    /**
     * When a rate limit of Discord stops the run, the sync skips the events
     * after the stop. A random order prevents that the same events are
     * skipped on each run.
     */
    const scheduledEvents = shuffle(ownScheduledEvents);

    const deletion = await deleteCancelledDiscordEvents(
      context,
      scheduledEvents,
    );

    let createdEventCount = 0;
    let updatedEventCount = 0;
    let linkedCreatorCount = 0;
    let seededBriefingCount = 0;
    let addedParticipantCount = 0;
    let removedParticipantCount = 0;
    let linkedParticipantCount = 0;
    let notificationsSent = deletion.notificationsSent;

    for (const scheduledEvent of scheduledEvents) {
      const reconciliation = await reconcileDiscordEvent(
        context,
        scheduledEvent,
      );
      if (reconciliation.reconciliation === EventReconciliation.Created)
        createdEventCount += 1;
      if (reconciliation.reconciliation === EventReconciliation.Updated)
        updatedEventCount += 1;
      if (reconciliation.linkedCreator) linkedCreatorCount += 1;
      if (reconciliation.seededBriefing) seededBriefingCount += 1;
      notificationsSent &&= reconciliation.notificationsSent;

      const participants = await syncDiscordParticipants(
        context,
        scheduledEvent,
        {
          isNewEvent:
            reconciliation.reconciliation === EventReconciliation.Created,
        },
      );
      if (participants) {
        addedParticipantCount += participants.addedCount;
        removedParticipantCount += participants.removedCount;
        linkedParticipantCount += participants.linkedCount;
        notificationsSent &&= participants.notificationsSent;
      }
    }

    return {
      fetchedEventCount: fetchResult.data.length,
      skippedPublishedEventCount:
        fetchResult.data.length - ownScheduledEvents.length,
      deletedEventCount: deletion.deletedEventCount,
      createdEventCount,
      updatedEventCount,
      linkedCreatorCount,
      seededBriefingCount,
      addedParticipantCount,
      removedParticipantCount,
      linkedParticipantCount,
      notificationsSent,
    };
  });
