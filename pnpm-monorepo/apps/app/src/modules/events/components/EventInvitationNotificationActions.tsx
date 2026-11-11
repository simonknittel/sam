"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { api } from "@/trpc/react";
import {
  EVENT_PARTICIPATION_TEXT_MAX_LENGTH,
  EventInvitationStatus,
} from "@sam-monorepo/domain";
import { useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import { acceptEventInvitation } from "../actions/acceptEventInvitation";
import { declineEventInvitation } from "../actions/declineEventInvitation";

const STATUS_LABELS: Record<EventInvitationStatus, string> = {
  [EventInvitationStatus.Open]: "Nicht mehr möglich",
  [EventInvitationStatus.Accepted]: "Angenommen",
  [EventInvitationStatus.Declined]: "Abgelehnt",
  [EventInvitationStatus.Withdrawn]: "Zurückgezogen",
};

enum AnswerAction {
  Accept = "accept",
  Decline = "decline",
}

interface Props {
  readonly eventId: string;
  readonly invitationId: string;
  /** Called after an answer, for example to mark the notification as read */
  readonly onAnswered: () => void;
}

/**
 * The answer to an invitation in its notification. The buttons show only
 * while the invitation can be answered, else the row shows the result. The
 * decline asks for an optional comment first.
 */
export const EventInvitationNotificationActions = ({
  eventId,
  invitationId,
  onAnswered,
}: Props) => {
  const utils = api.useUtils();
  const { data: state } = api.events.getOwnInvitationState.useQuery({
    invitationId,
  });

  const [isDeclining, setIsDeclining] = useState(false);
  const [comment, setComment] = useState("");
  const [pendingAction, setPendingAction] = useState<AnswerAction | null>(null);

  if (!state) return null;

  if (!state.isAnswerable)
    return (
      <p className="relative mt-1 text-xs text-neutral-500">
        Einladung: {STATUS_LABELS[state.status]}
      </p>
    );

  const answer = async (answerAction: AnswerAction) => {
    const formData = new FormData();
    formData.set("eventId", eventId);
    if (answerAction === AnswerAction.Decline) formData.set("comment", comment);

    setPendingAction(answerAction);
    const response = await runAction(
      answerAction === AnswerAction.Accept
        ? acceptEventInvitation
        : declineEventInvitation,
      formData,
    );
    /** Also after an error: a different tab can have answered */
    await utils.events.getOwnInvitationState.invalidate({ invitationId });
    setPendingAction(null);
    if (response) onAnswered();
  };

  const isPending = pendingAction !== null;

  /** `relative` lifts the controls above the link of the row */
  if (isDeclining)
    return (
      <div className="relative mt-2">
        <Textarea
          name="comment"
          label="Kommentar"
          hint={`optional, max. ${EVENT_PARTICIPATION_TEXT_MAX_LENGTH} Zeichen`}
          maxLength={EVENT_PARTICIPATION_TEXT_MAX_LENGTH}
          value={comment}
          onChange={(changeEvent) => setComment(changeEvent.target.value)}
          classNameTextarea="h-16"
          autoFocus
        />

        <div className="mt-2 flex justify-end gap-2">
          <Button2
            type="button"
            variant={Button2Variant.Secondary}
            onClick={() => setIsDeclining(false)}
            disabled={isPending}
          >
            Abbrechen
          </Button2>

          <Button2
            type="button"
            onClick={() => void answer(AnswerAction.Decline)}
            disabled={isPending}
          >
            {pendingAction === AnswerAction.Decline ? (
              <AsciiSpinner />
            ) : (
              <FaTimes />
            )}
            Ablehnen
          </Button2>
        </div>
      </div>
    );

  return (
    <div className="relative mt-2 flex gap-2">
      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        onClick={() => setIsDeclining(true)}
        disabled={isPending}
      >
        <FaTimes />
        Ablehnen
      </Button2>

      <Button2
        type="button"
        onClick={() => void answer(AnswerAction.Accept)}
        disabled={isPending}
      >
        {pendingAction === AnswerAction.Accept ? <AsciiSpinner /> : <FaCheck />}
        Annehmen
      </Button2>
    </div>
  );
};
