import { prisma } from "@/db";
import type { EventParticipantRow } from "@/modules/events/queries/eventRelationSelects";
import type { Event } from "@sam-monorepo/database/client";
import { cache } from "react";

/**
 * Resolves the citizens behind an event's participation rows. App rows carry
 * the citizen id directly; Discord rows are matched via the citizen's
 * Discord id (covering rows whose citizen was created after the last sync
 * resolved them).
 */
export const getParticipants = cache(
  async (
    event: Event & {
      participants: EventParticipantRow[];
    },
  ) => {
    const citizenIds = new Set<string>();
    const discordUserIds = new Set<string>();

    for (const participant of event.participants) {
      if (participant.citizenId) {
        citizenIds.add(participant.citizenId);
      } else if (participant.discordUserId) {
        discordUserIds.add(participant.discordUserId);
      }
    }

    const citizens = await prisma.entity.findMany({
      where: {
        OR: [
          { id: { in: Array.from(citizenIds) } },
          { discordId: { in: Array.from(discordUserIds) } },
        ],
      },
      select: {
        id: true,
        handle: true,
        discordId: true,
        roleAssignments: { select: { roleId: true, currentLevel: true } },
      },
    });

    const resolvedParticipants = citizens.map((citizen) => {
      const matchingParticipant = event.participants.find(
        (participant) =>
          participant.citizenId === citizen.id ||
          (participant.citizenId === null &&
            participant.discordUserId !== null &&
            participant.discordUserId === citizen.discordId),
      );

      return {
        participant: matchingParticipant,
        citizen,
      };
    });

    return resolvedParticipants;
  },
);
