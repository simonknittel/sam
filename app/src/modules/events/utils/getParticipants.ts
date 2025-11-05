import { prisma } from "@/db";
import type { Event, EventDiscordParticipant } from "@prisma/client";
import { cache } from "react";

export const getParticipants = cache(
  async (
    event: Event & {
      discordParticipants: EventDiscordParticipant[];
    },
  ) => {
    const discordUserIds = new Set<string>();

    for (const user of event.discordParticipants) {
      discordUserIds.add(user.discordUserId);
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
      const EventDiscordParticipant = event.discordParticipants.find(
        (participant) => participant.discordUserId === citizen.discordId,
      );

      return {
        participant: EventDiscordParticipant,
        citizen,
      };
    });

    return resolvedParticipants;
  },
);
