import { prisma } from "@/db";
import type { Event, EventParticipant } from "@sam-monorepo/database/client";
import { cache } from "react";

export const getParticipants = cache(
  async (
    event: Event & {
      participants: EventParticipant[];
    },
  ) => {
    const discordUserIds = new Set<string>();

    for (const participant of event.participants) {
      if (participant.discordUserId)
        discordUserIds.add(participant.discordUserId);
    }

    const citizens = await prisma.entity.findMany({
      where: {
        discordId: {
          in: Array.from(discordUserIds),
        },
      },
      include: {
        roleAssignments: true,
      },
    });

    const resolvedParticipants = citizens.map((citizen) => {
      const matchingParticipant = event.participants.find(
        (participant) => participant.discordUserId === citizen.discordId,
      );

      return {
        participant: matchingParticipant,
        citizen,
      };
    });

    return resolvedParticipants;
  },
);
