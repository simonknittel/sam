import { AuditEventType } from "@sam-monorepo/domain";
import "./scrape-discord-events/setup"; // must be first

import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import type { ScheduledHandler } from "aws-lambda";
import { shuffle } from "lodash";
import { createAuditEvents } from "./common/audit";
import { log } from "./common/logger";
import { initializeRequestContext } from "./common/requestContext";
import { buildBriefingRootPageData } from "./scrape-discord-events/buildBriefingRootPageData";
import { deleteCancelledEvents } from "./scrape-discord-events/deleteCancelledEvents";
import { getEvents } from "./scrape-discord-events/discord/utils/getEvents";
import { triggerNotifications } from "./scrape-discord-events/notifications";
import { excludeAppPublishedEvents } from "./scrape-discord-events/reconciliation";
import { updateParticipants } from "./scrape-discord-events/updateParticipants";

/** The guild scheduled event ids the app itself owns, right now. */
const getAppPublishedDiscordIds = async () => {
  const events = await prisma.event.findMany({
    where: { discordPublishedId: { not: null } },
    select: { discordPublishedId: true },
  });

  return events.map((event) => event.discordPublishedId!);
};

export const handler: ScheduledHandler = async (event, context) => {
  return initializeRequestContext(context.awsRequestId, async () => {
    try {
      /**
       * Everything the app published to the guild itself is invisible to
       * this sync — those events already live in the database as APP rows
       * and the app keeps them up to date from its own side.
       *
       * Read on both sides of the fetch and unioned, because either order
       * alone loses a race: an event published after the DB read would not
       * be excluded, and one unpublished after it would be excluded by the
       * later read but had already been fetched. Both cases would import it
       * as a duplicate — and the second would then have the participant
       * sync call a scheduled event that no longer exists, aborting the run.
       */
      const publishedIdsBeforeFetch = await getAppPublishedDiscordIds();
      const { data: _futureEventsFromDiscord } = await getEvents();
      void log.info("Fetched events from Discord", {
        count: _futureEventsFromDiscord.length,
        eventIds: _futureEventsFromDiscord.map((event) => event.id),
      });
      const publishedIdsAfterFetch = await getAppPublishedDiscordIds();

      const ownEventsFromDiscord = excludeAppPublishedEvents(
        _futureEventsFromDiscord,
        new Set([...publishedIdsBeforeFetch, ...publishedIdsAfterFetch]),
      );
      if (ownEventsFromDiscord.length !== _futureEventsFromDiscord.length)
        void log.info("Skipped guild events the app published itself", {
          count: _futureEventsFromDiscord.length - ownEventsFromDiscord.length,
        });

      // Shuffle array so rate limits not always hitting the same events
      const futureEventsFromDiscord = shuffle(ownEventsFromDiscord);
      // // Limit to 5 events to avoid rate limits
      // futureEventsFromDiscord = futureEventsFromDiscord.slice(0, 5);

      await deleteCancelledEvents(futureEventsFromDiscord);

      for (const futureEventFromDiscord of futureEventsFromDiscord) {
        const existingEventFromDatabase = await prisma.event.findUnique({
          where: {
            discordId: futureEventFromDiscord.id,
          },
          include: {
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

        if (existingEventFromDatabase) {
          const hasAnyChanges =
            existingEventFromDatabase.name !== futureEventFromDiscord.name ||
            existingEventFromDatabase.startTime.getTime() !==
              futureEventFromDiscord.scheduled_start_time.getTime() ||
            // biome-ignore lint/suspicious/noDoubleEquals: <explanation>
            existingEventFromDatabase.endTime?.getTime() !=
              futureEventFromDiscord.scheduled_end_time?.getTime() ||
            // biome-ignore lint/suspicious/noDoubleEquals: <explanation>
            existingEventFromDatabase.description !=
              futureEventFromDiscord.description ||
            // biome-ignore lint/suspicious/noDoubleEquals: <explanation>
            existingEventFromDatabase.location !=
              futureEventFromDiscord.entity_metadata.location ||
            // biome-ignore lint/suspicious/noDoubleEquals: <explanation>
            existingEventFromDatabase.discordImage !=
              futureEventFromDiscord.image;

          if (hasAnyChanges) {
            await prisma.event.update({
              where: {
                id: existingEventFromDatabase.id,
              },
              data: {
                name: futureEventFromDiscord.name,
                startTime: futureEventFromDiscord.scheduled_start_time,
                endTime: futureEventFromDiscord.scheduled_end_time,
                description: futureEventFromDiscord.description,
                location:
                  futureEventFromDiscord.entity_metadata.location || null,
                discordImage: futureEventFromDiscord.image,
              },
            });

            void log.info("Updated event from Discord", {
              eventId: existingEventFromDatabase.id,
              discordEventId: futureEventFromDiscord.id,
            });

            await createAuditEvents([
              {
                type: AuditEventType.EVENT_UPDATED_FROM_DISCORD,
                data: {
                  eventId: existingEventFromDatabase.id,
                  discordId: futureEventFromDiscord.id,
                  name: futureEventFromDiscord.name,
                },
              },
            ]);
          }

          const hasChangesForNotification =
            existingEventFromDatabase.name !== futureEventFromDiscord.name ||
            existingEventFromDatabase.startTime.getTime() !==
              futureEventFromDiscord.scheduled_start_time.getTime() ||
            // biome-ignore lint/suspicious/noDoubleEquals: <explanation>
            existingEventFromDatabase.endTime?.getTime() !=
              futureEventFromDiscord.scheduled_end_time?.getTime() ||
            // biome-ignore lint/suspicious/noDoubleEquals: <explanation>
            existingEventFromDatabase.description !=
              futureEventFromDiscord.description ||
            // biome-ignore lint/suspicious/noDoubleEquals: <explanation>
            existingEventFromDatabase.location !=
              futureEventFromDiscord.entity_metadata.location;

          if (hasChangesForNotification) {
            await triggerNotifications([
              {
                type: "EventUpdated",
                payload: {
                  eventId: existingEventFromDatabase.id,
                },
              },
            ]);
          }

          if (existingEventFromDatabase.wikiPages.length === 0) {
            await prisma.wikiPage.create({
              data: {
                ...(await buildBriefingRootPageData(
                  existingEventFromDatabase.discordCreatorId,
                )),
                eventId: existingEventFromDatabase.id,
              },
            });

            void log.info("Seeded missing briefing page for existing event", {
              eventId: existingEventFromDatabase.id,
              discordEventId: futureEventFromDiscord.id,
            });
          }
        } else {
          const newEvent = await prisma.event.create({
            data: {
              source: EventSource.DISCORD,
              discordId: futureEventFromDiscord.id,
              discordCreatorId: futureEventFromDiscord.creator_id,
              name: futureEventFromDiscord.name,
              startTime: futureEventFromDiscord.scheduled_start_time,
              endTime: futureEventFromDiscord.scheduled_end_time,
              description: futureEventFromDiscord.description,
              location: futureEventFromDiscord.entity_metadata.location || null,
              discordImage: futureEventFromDiscord.image,
              discordGuildId: futureEventFromDiscord.guild_id,
              wikiPages: {
                create: await buildBriefingRootPageData(
                  futureEventFromDiscord.creator_id,
                ),
              },
            },
            select: {
              id: true,
            },
          });

          void log.info("Created new event from Discord", {
            eventId: newEvent.id,
            discordEventId: futureEventFromDiscord.id,
          });

          await createAuditEvents([
            {
              type: AuditEventType.EVENT_IMPORTED_FROM_DISCORD,
              data: {
                eventId: newEvent.id,
                discordId: futureEventFromDiscord.id,
                name: futureEventFromDiscord.name,
              },
            },
          ]);

          await triggerNotifications([
            {
              type: "EventCreated",
              payload: {
                eventId: newEvent.id,
              },
            },
          ]);
        }

        await updateParticipants(futureEventFromDiscord);
      }

      void log.info("Finished scraping Discord events");
    } catch (error) {
      // @ts-expect-error
      void log.error("Failed to scrape Discord events", error);
      throw error;
    }
  });
};
