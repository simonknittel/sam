import type { EventParticipant } from "@sam-monorepo/database/client";

/**
 * The citizens behind an event's participation rows, as the two identifiers a
 * `Ship.owner` can be matched by: an app sign-up carries the citizen id, a
 * Discord RSVP only the Discord id. The fleet counts and the lineup must
 * resolve the same set of citizens, thus both go through this function.
 */
export const collectParticipantOwners = (
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
    citizenIds: Array.from(citizenIds),
    discordUserIds: Array.from(discordUserIds),
  };
};
