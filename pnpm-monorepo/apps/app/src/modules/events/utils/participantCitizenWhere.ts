import type { EventParticipant, Prisma } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";

/**
 * The citizens behind an event's participation rows. An app sign-up carries
 * the citizen id. A Discord RSVP carries the citizen id only after the
 * Discord sync found the citizen, until then only the Discord id. A deleted
 * citizen keeps its Discord id and a new citizen can have the same one, thus
 * the Discord id finds only citizens that are not deleted. The participant
 * list, the fleet counts and the lineup must resolve the same set of
 * citizens, thus all go through this function.
 */
export const buildParticipantCitizenWhere = (
  participants: readonly Pick<
    EventParticipant,
    "citizenId" | "discordUserId"
  >[],
) => {
  const citizenIds = new Set<string>();
  const discordUserIds = new Set<string>();

  for (const participant of participants) {
    if (participant.citizenId) {
      citizenIds.add(participant.citizenId);
    } else if (participant.discordUserId) {
      discordUserIds.add(participant.discordUserId);
    }
  }

  return {
    OR: [
      { id: { in: Array.from(citizenIds) } },
      {
        discordId: { in: Array.from(discordUserIds) },
        ...ACTIVE_CITIZEN_WHERE,
      },
    ],
  } satisfies Prisma.CitizenWhereInput;
};
