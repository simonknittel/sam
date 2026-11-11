"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { api } from "@/trpc/react";
import { EventInvitationStatus } from "@sam-monorepo/domain";
import { useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import { EventParticipationModal } from "./EventParticipationModal";

const STATUS_LABELS: Record<EventInvitationStatus, string> = {
  [EventInvitationStatus.Open]: "Nicht mehr möglich",
  [EventInvitationStatus.Accepted]: "Angenommen",
  [EventInvitationStatus.Declined]: "Abgelehnt",
  [EventInvitationStatus.Withdrawn]: "Zurückgezogen",
};

interface Props {
  readonly eventId: string;
  readonly eventName: string;
  readonly invitationId: string;
  /** Called after an answer, for example to mark the notification as read */
  readonly onAnswered: () => void;
}

/**
 * The answer to an invitation from its notification. The buttons show only
 * while the invitation can be answered, else the row shows the result. Both
 * buttons open the participation modal of the event, where the citizen can
 * write a comment before the answer.
 */
export const EventInvitationNotificationActions = ({
  eventId,
  eventName,
  invitationId,
  onAnswered,
}: Props) => {
  const utils = api.useUtils();
  const { data: state } = api.events.getOwnInvitationState.useQuery({
    invitationId,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!state) return null;

  if (!state.isAnswerable)
    return (
      <p className="relative mt-1 text-xs text-neutral-500">
        Einladung: {STATUS_LABELS[state.status]}
      </p>
    );

  /** Also after an error: a different tab can have answered */
  const closeModal = () => {
    setIsModalOpen(false);
    void utils.events.getOwnInvitationState.invalidate({ invitationId });
  };

  return (
    <>
      {/* `relative` lifts the buttons above the link of the row */}
      <div className="relative mt-2 flex gap-2">
        <Button2
          type="button"
          variant={Button2Variant.Secondary}
          onClick={() => setIsModalOpen(true)}
        >
          <FaTimes />
          Ablehnen
        </Button2>

        <Button2 type="button" onClick={() => setIsModalOpen(true)}>
          <FaCheck />
          Annehmen
        </Button2>
      </div>

      {isModalOpen && (
        <EventParticipationModal
          eventId={eventId}
          eventName={eventName}
          isSignedUp={false}
          hasCancelled={false}
          comment={null}
          openInvitation={{
            message: state.message,
            invitedBy: state.invitedBy,
          }}
          onInvitationAnswered={() => {
            closeModal();
            onAnswered();
          }}
          onRequestClose={closeModal}
        />
      )}
    </>
  );
};
