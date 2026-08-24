import type {
  EventCitizenReference,
  EventParticipantRow,
} from "@/modules/events/queries/eventRelationSelects";
import { canReadEventBriefing } from "@/modules/wiki/utils/canReadEventBriefing";
import type { Event as PrismaEvent } from "@sam-monorepo/database/client";
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
    participants: EventParticipantRow[];
    managers: EventCitizenReference[];
  };
  readonly index: number;
}

export const Event = async ({ className, event, index }: Props) => {
  const [showLineupButton, showBriefingButton] = await Promise.all([
    isLineupVisible(event),
    canReadEventBriefing(event),
  ]);

  return (
    <EventClient
      className={className}
      event={event}
      index={index}
      showLineupButton={showLineupButton}
      showBriefingButton={showBriefingButton}
    />
  );
};
