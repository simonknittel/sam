"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Textarea } from "@/modules/common/components/form/Textarea";
import type { Citizen } from "@sam-monorepo/database/browser";
import { EVENT_PARTICIPATION_TEXT_MAX_LENGTH } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import { acceptEventInvitation } from "../actions/acceptEventInvitation";
import { declineEventInvitation } from "../actions/declineEventInvitation";

export interface OpenEventInvitation {
  readonly message: string | null;
  readonly invitedBy: Pick<Citizen, "id" | "handle" | "deletedAt"> | null;
}

interface Props {
  readonly className?: string;
  readonly eventId: string;
  readonly invitation: OpenEventInvitation;
  readonly onAnswered?: () => void;
  /** See `EventParticipationControls` */
  readonly autoFocusComment?: boolean;
}

/**
 * The answer to an open invitation. The comment is the comment of the
 * sign-up on accept and the note to the organizers on decline.
 */
export const EventInvitationAnswerForm = ({
  className,
  eventId,
  invitation,
  onAnswered,
  autoFocusComment,
}: Props) => {
  /**
   * The errors show as toasts: an error such as "no open invitation"
   * refreshes the page, which then shows the current state
   */
  const accept = useAction(acceptEventInvitation, { onSuccess: onAnswered });
  const decline = useAction(declineEventInvitation, { onSuccess: onAnswered });
  const isPending = accept.isPending || decline.isPending;

  /** Controlled, see the sign-up form of `EventParticipationControls` */
  const [comment, setComment] = useState("");

  return (
    <div className={clsx(className)}>
      <p className="text-sm text-neutral-300">
        <CitizenLink citizen={invitation.invitedBy} /> hat dich eingeladen.
      </p>

      {invitation.message && (
        <p className="mt-1 border-l-2 border-neutral-700 pl-2 text-sm whitespace-pre-wrap">
          {invitation.message}
        </p>
      )}

      <form className="mt-2">
        <input type="hidden" name="eventId" value={eventId} />

        <Textarea
          name="comment"
          label="Kommentar"
          hint={`optional, max. ${EVENT_PARTICIPATION_TEXT_MAX_LENGTH} Zeichen, für die Anmeldung oder als Grund der Absage`}
          maxLength={EVENT_PARTICIPATION_TEXT_MAX_LENGTH}
          value={comment}
          onChange={(changeEvent) => setComment(changeEvent.target.value)}
          classNameTextarea="h-20"
          autoFocus={autoFocusComment}
        />

        <div className="mt-2 flex justify-end gap-2">
          <Button2
            type="submit"
            formAction={decline.formAction}
            variant={Button2Variant.Secondary}
            disabled={isPending}
          >
            {decline.isPending ? <AsciiSpinner /> : <FaTimes />}
            Ablehnen
          </Button2>

          <Button2
            type="submit"
            formAction={accept.formAction}
            disabled={isPending}
          >
            {accept.isPending ? <AsciiSpinner /> : <FaCheck />}
            Annehmen
          </Button2>
        </div>
      </form>
    </div>
  );
};
