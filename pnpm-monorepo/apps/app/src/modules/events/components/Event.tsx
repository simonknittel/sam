import { canReadEventBriefing } from "@/modules/wiki/utils/canReadEventBriefing";
import {
  toEventApplicationStatus,
  type EventListRow,
} from "@sam-monorepo/application";
import { isLineupVisible } from "../utils/isLineupVisible";
import { mustApplyForEvent } from "../utils/mustApplyForEvent";
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
  readonly event: EventListRow;
  readonly index: number;
  readonly hasCancelledParticipation?: boolean;
  readonly isNew: boolean;
}

export const Event = async ({
  className,
  event,
  index,
  hasCancelledParticipation,
  isNew,
}: Props) => {
  const [showLineupButton, showBriefingButton, applicationRequired] =
    await Promise.all([
      isLineupVisible(event),
      // The participants are the rows of the viewer only. That is sufficient
      // for the check if the viewer takes part.
      canReadEventBriefing(event),
      mustApplyForEvent(event),
    ]);

  const ownParticipation = event.participants.at(0);
  const openInvitation = event.invitations.at(0);
  // The latest application of the viewer
  const ownApplication = event.applications.at(0);

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
        participationEnabled: event.participationEnabled,
        applicationRequired,
        participantCount: event._count.participants,
      }}
      ownParticipation={
        ownParticipation ? { comment: ownParticipation.comment } : null
      }
      openInvitation={
        openInvitation
          ? {
              message: openInvitation.message,
              invitedBy: openInvitation.createdBy,
            }
          : null
      }
      ownApplication={
        ownApplication
          ? {
              status: toEventApplicationStatus(ownApplication),
              comment: ownApplication.comment,
              declineReason: ownApplication.declineReason,
            }
          : null
      }
      index={index}
      showLineupButton={showLineupButton}
      showBriefingButton={showBriefingButton}
      hasCancelledParticipation={hasCancelledParticipation}
      isNew={isNew}
    />
  );
};
