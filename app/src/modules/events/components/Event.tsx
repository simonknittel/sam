import type {
  Entity,
  EventDiscordParticipant,
  Event as PrismaEvent,
} from "@prisma/client";
import { isLineupVisible } from "../utils/isLineupVisible";
import { EventClient } from "./EventClient";

/**
 * Image size:
 * Discord recommends 800x320px.
 * Our maximum height should be 160px. Therefore, we calculate the width based
 * on the aspect ratio.
 * 800 / 320 * 160 = 400
 */

interface Props {
  readonly className?: string;
  readonly event: PrismaEvent & {
    discordParticipants: EventDiscordParticipant[];
    managers: Entity[];
  };
  readonly index: number;
}

export const Event = async ({ className, event, index }: Props) => {
  const showLineupButton = await isLineupVisible(event);

  return (
    <EventClient
      className={className}
      event={event}
      index={index}
      showLineupButton={showLineupButton}
    />
  );
};
