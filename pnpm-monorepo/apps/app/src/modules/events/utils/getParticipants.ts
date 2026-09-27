import { prisma } from "@/db";
import type { EventParticipantRow } from "@/modules/events/queries/eventRelationSelects";
import type { Event } from "@sam-monorepo/database/client";
import { cache } from "react";
import { buildParticipantCitizenWhere } from "./participantCitizenWhere";

/**
 * Resolves the citizens behind an event's participation rows, see
 * `buildParticipantCitizenWhere()`. A sign-up of a deleted citizen stays in
 * the list and shows the deleted label.
 */
export const getParticipants = cache(
  async (
    event: Event & {
      participants: EventParticipantRow[];
    },
  ) => {
    const citizens = await prisma.citizen.findMany({
      where: buildParticipantCitizenWhere(event.participants),
      select: {
        id: true,
        handle: true,
        deletedAt: true,
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
