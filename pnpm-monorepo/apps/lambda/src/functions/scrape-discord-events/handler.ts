import { prisma } from "@sam-monorepo/database";
import shuffle from "lodash/shuffle";
import { log } from "../../common/logger";
import { deleteCancelledEvents } from "./deleteCancelledEvents";
import { getEvents } from "./discord/utils/getEvents";
import { triggerNotifications } from "./notifications";
import { updateParticipants } from "./updateParticipants";

export const scrapeDiscordEventsHandler = async () => {
  try {
    const { data: _futureEventsFromDiscord } = await getEvents();

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
              location: futureEventFromDiscord.entity_metadata.location || null,
              discordImage: futureEventFromDiscord.image,
            },
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
  } catch (error) {
    log.error("Failed to scrape Discord events", error);
    throw error;
  }
};
