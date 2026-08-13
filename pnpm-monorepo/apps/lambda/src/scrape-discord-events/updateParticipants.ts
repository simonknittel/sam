import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import type { z } from "zod";
import { createAuditEvents } from "../common/audit";
import { getEventUsers } from "./discord/utils/getEventUsers";
import type { eventSchema } from "./discord/utils/schemas";

export const updateParticipants = async (
  discordEvent: z.infer<typeof eventSchema>,
) => {
  const databaseEvent = await prisma.event.findUnique({
    where: {
      discordId: discordEvent.id,
    },
  });
  if (!databaseEvent) return;

  const participants: { create: string[]; delete: string[] } = {
    create: [],
    delete: [],
  };
  const discordEventUserIds = (await getEventUsers(discordEvent.id)).map(
    (user) => user.user_id,
  );
  const existingDatabaseParticipantIds = (
    await prisma.eventDiscordParticipant.findMany({
      where: {
        event: {
          discordId: discordEvent.id,
        },
      },
    })
  ).map((participant) => participant.discordUserId);

  // Collect new participants
  for (const userId of discordEventUserIds) {
    if (existingDatabaseParticipantIds.includes(userId)) continue;
    participants.create.push(userId);
  }

  // Collect removed participants
  for (const userId of existingDatabaseParticipantIds) {
    if (discordEventUserIds.includes(userId)) continue;
    participants.delete.push(userId);
  }

  // Save to database
  if (participants.delete.length > 0) {
    await prisma.$transaction([
      prisma.eventDiscordParticipant.deleteMany({
        where: {
          eventId: databaseEvent.id,
          discordUserId: {
            in: participants.delete,
          },
        },
      }),

      prisma.eventPositionApplication.deleteMany({
        where: {
          position: {
            eventId: databaseEvent.id,
          },
          citizen: {
            discordId: {
              in: participants.delete,
            },
          },
        },
      }),

      prisma.eventPosition.updateMany({
        where: {
          eventId: databaseEvent.id,
          citizen: {
            discordId: {
              in: participants.delete,
            },
          },
        },
        data: {
          citizenId: null,
        },
      }),
    ]);
  }
  if (participants.create.length > 0) {
    await prisma.eventDiscordParticipant.createMany({
      data: participants.create.map((participantId) => ({
        eventId: databaseEvent.id,
        discordUserId: participantId,
      })),
    });
  }

  /**
   * Leaving an event also drops the citizen's position applications and
   * unassigns them from their lineup positions, so a sync is worth
   * recording even though it only mirrors Discord.
   */
  if (participants.create.length > 0 || participants.delete.length > 0) {
    await createAuditEvents([
      {
        type: AuditEventType.EVENT_PARTICIPANTS_SYNCED,
        data: {
          eventId: databaseEvent.id,
          addedCount: participants.create.length,
          removedCount: participants.delete.length,
        },
      },
    ]);
  }
};
