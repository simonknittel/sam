"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { cancelEventParticipation } from "@/modules/events/actions/cancelEventParticipation";
import { signUpForEvent } from "@/modules/events/actions/signUpForEvent";
import { updateEventParticipationComment } from "@/modules/events/actions/updateEventParticipationComment";
import clsx from "clsx";
import { useState } from "react";
import { FaCheck, FaSave, FaSignInAlt, FaTimes } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly eventId: string;
  readonly isSignedUp: boolean;
  readonly hasCancelled: boolean;
  readonly comment: string | null;
  readonly participationOpen: boolean;
}

export const EventParticipationControls = ({
  className,
  eventId,
  isSignedUp,
  hasCancelled,
  comment,
  participationOpen,
}: Props) => {
  const signUp = useAction(signUpForEvent, { errorToast: false });
  const updateComment = useAction(updateEventParticipationComment, {
    errorToast: false,
  });

  /**
   * Controlled on purpose: router refreshes re-render this tile in the
   * background (e.g. after signing up), and an uncontrolled textarea's
   * displayed value can get clobbered by the incoming default while the
   * user is typing.
   */
  const [signUpComment, setSignUpComment] = useState("");
  const [commentDraft, setCommentDraft] = useState(comment ?? "");

  /**
   * Re-seed the draft when the stored comment changes (e.g. a fresh
   * sign-up after a cancellation) — same render-time pattern as RadioGroup.
   */
  const [previousComment, setPreviousComment] = useState(comment);
  if (comment !== previousComment) {
    setPreviousComment(comment);
    setCommentDraft(comment ?? "");
  }

  return (
    <div className={clsx(className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2">
          {isSignedUp ? (
            <>
              <FaCheck className="text-green-500" />
              Zugesagt
            </>
          ) : (
            <>
              <FaTimes className="text-red-500" />
              {hasCancelled ? "Abgemeldet" : "Nicht angemeldet"}
            </>
          )}
        </p>

        {participationOpen && isSignedUp && (
          <ConfirmActionButton
            action={cancelEventParticipation}
            hiddenFields={[{ name: "eventId", value: eventId }]}
            trigger={(isPending) => (
              <Button2
                type="button"
                variant={Button2Variant.Secondary}
                disabled={isPending}
              >
                {isPending ? <AsciiSpinner /> : <FaTimes />}
                Abmelden
              </Button2>
            )}
            title="Vom Event abmelden?"
            description="Deine Posten in der Aufstellung und deine Bewerbungen werden dabei entfernt."
            confirmLabel="Abmelden"
          />
        )}
      </div>

      {!participationOpen && (
        <>
          {isSignedUp && comment && (
            <p className="mt-1 text-sm text-neutral-300">{comment}</p>
          )}

          <p className="mt-1 text-neutral-500 text-sm">
            Die Anmeldung ist geschlossen.
          </p>
        </>
      )}

      {participationOpen && !isSignedUp && (
        <form action={signUp.formAction} className="mt-2">
          <input type="hidden" name="eventId" value={eventId} />

          <Textarea
            name="comment"
            label="Kommentar"
            hint="optional, max. 500 Zeichen"
            maxLength={500}
            value={signUpComment}
            onChange={(changeEvent) => setSignUpComment(changeEvent.target.value)}
            classNameTextarea="h-20"
          />

          <Button2
            type="submit"
            disabled={signUp.isPending}
            className="mt-2 ml-auto"
          >
            {signUp.isPending ? <AsciiSpinner /> : <FaSignInAlt />}
            Anmelden
          </Button2>

          <ActionErrorNote className="mt-2" state={signUp.state} />
        </form>
      )}

      {participationOpen && isSignedUp && (
        <>
          <form action={updateComment.formAction} className="mt-2">
            <input type="hidden" name="eventId" value={eventId} />

            <Textarea
              name="comment"
              label="Kommentar"
              hint="optional, max. 500 Zeichen"
              maxLength={500}
              value={commentDraft}
              onChange={(changeEvent) =>
                setCommentDraft(changeEvent.target.value)
              }
              classNameTextarea="h-20"
            />

            <Button2
              type="submit"
              disabled={updateComment.isPending}
              className="mt-2 ml-auto"
            >
              {updateComment.isPending ? <AsciiSpinner /> : <FaSave />}
              Kommentar speichern
            </Button2>

            <ActionErrorNote className="mt-2" state={updateComment.state} />
          </form>
        </>
      )}
    </div>
  );
};
