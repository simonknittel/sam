import type { EventListItem } from "@/modules/events/queries/getEvents";
import { canReadEventBriefing } from "@/modules/wiki/utils/canReadEventBriefing";
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
  readonly event: EventListItem;
  readonly index: number;
  readonly hasCancelledParticipation?: boolean;
}

export const Event = async ({
  className,
  event,
  index,
  hasCancelledParticipation,
}: Props) => {
  const [showLineupButton, showBriefingButton] = await Promise.all([
    isLineupVisible(event),
    // The participants are the rows of the viewer only. That is sufficient
    // for the check if the viewer takes part.
    canReadEventBriefing(event),
  ]);

  const ownParticipation = event.participants.at(0);

  return (
    <EventClient
      className={className}
      event={{
        id: event.id,
        name: event.name,
        startTime: event.startTime,
        endTime: event.endTime,
        source: event.source,
        discordId: event.discordId,
        discordGuildId: event.discordGuildId,
        discordImage: event.discordImage,
        coverImage: event.coverImage,
        participantCount: event._count.participants,
      }}
      ownParticipation={
        ownParticipation ? { comment: ownParticipation.comment } : null
      }
      index={index}
      showLineupButton={showLineupButton}
      showBriefingButton={showBriefingButton}
      hasCancelledParticipation={hasCancelledParticipation}
    />
  );
};
