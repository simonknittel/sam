"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
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
  /**
   * The errors show as toasts, not in the forms: an error such as "already
   * signed up" refreshes the page, which then shows the other form.
   */
  const signUp = useAction(signUpForEvent);
  const updateComment = useAction(updateEventParticipationComment);

  /**
   * Controlled on purpose: router refreshes re-render this tile in the
   * background (e.g. after signing up), and an uncontrolled textarea's
   * displayed value can get clobbered by the incoming default while the
   * user is typing.
   */
  const [signUpComment, setSignUpComment] = useState("");
  const [commentDraft, setCommentDraft] = useState(comment ?? "");

  /**
   * Adopt the stored comment when it changes (e.g. a fresh sign-up after a
   * cancellation) — adjusted during render, not in an effect.
   *
   * Only while the draft is untouched, though: those same background
   * refreshes arrive whenever an action refreshes the page, and adopting
   * unconditionally would discard whatever the user had typed by then.
   */
  const [previousComment, setPreviousComment] = useState(comment);
  if (comment !== previousComment) {
    const isDraftUntouched = commentDraft === (previousComment ?? "");
    setPreviousComment(comment);
    if (isDraftUntouched) setCommentDraft(comment ?? "");
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
                type="submit"
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

          <p className="mt-1 text-sm text-neutral-500">
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
            onChange={(changeEvent) =>
              setSignUpComment(changeEvent.target.value)
            }
            classNameTextarea="h-20"
          />

          <SubmitButton icon={<FaSignInAlt />} className="mt-2 ml-auto">
            Anmelden
          </SubmitButton>
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

            <SubmitButton icon={<FaSave />} className="mt-2 ml-auto">
              Kommentar speichern
            </SubmitButton>
          </form>
        </>
      )}
    </div>
  );
};
