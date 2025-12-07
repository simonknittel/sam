import "./scrape-discord-events/setup"; // must be first

import { prisma } from "@sam-monorepo/database";
import type { ScheduledHandler } from "aws-lambda";
import { shuffle } from "lodash";
import { log } from "./common/logger";
import { initializeRequestContext } from "./common/requestContext";
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
            },
            select: {
              id: true,
            },
          });

          void log.info("Created new event from Discord", {
            eventId: newEvent.id,
            discordEventId: futureEventFromDiscord.id,
          });

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
