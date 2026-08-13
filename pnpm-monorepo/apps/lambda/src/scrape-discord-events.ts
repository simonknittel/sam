import { AuditEventType } from "@sam-monorepo/domain";
import "./scrape-discord-events/setup"; // must be first

import { prisma } from "@sam-monorepo/database";
import type { ScheduledHandler } from "aws-lambda";
import { shuffle } from "lodash";
import { createAuditEvents } from "./common/audit";
import { log } from "./common/logger";
import { initializeRequestContext } from "./common/requestContext";
import { buildBriefingRootPageData } from "./scrape-discord-events/buildBriefingRootPageData";
import { deleteCancelledEvents } from "./scrape-discord-events/deleteCancelledEvents";
import { getEvents } from "./scrape-discord-events/discord/utils/getEvents";
import { triggerNotifications } from "./scrape-discord-events/notifications";
import { updateParticipants } from "./scrape-discord-events/updateParticipants";

export const handler: ScheduledHandler = async (event, context) => {
  return initializeRequestContext(context.awsRequestId, async () => {
    try {
      const { data: _futureEventsFromDiscord } = await getEvents();
      void log.info("Fetched events from Discord", {
        count: _futureEventsFromDiscord.length,
        eventIds: _futureEventsFromDiscord.map((event) => event.id),
      });

      // Shuffle array so rate limits not always hitting the same events
      const futureEventsFromDiscord = shuffle(_futureEventsFromDiscord);
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
