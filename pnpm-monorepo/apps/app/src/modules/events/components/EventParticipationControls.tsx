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
import {
  EVENT_PARTICIPATION_TEXT_MAX_LENGTH,
  EventApplicationStatus,
} from "@sam-monorepo/domain";
import clsx from "clsx";
import { useState } from "react";
import {
  FaCheck,
  FaEnvelope,
  FaHourglassHalf,
  FaSave,
  FaSignInAlt,
  FaTimes,
} from "react-icons/fa";
import {
  EventApplicationControls,
  type OwnEventApplication,
} from "./EventApplicationControls";
import {
  EventInvitationAnswerForm,
  type OpenEventInvitation,
} from "./EventInvitationAnswerForm";

export interface EventParticipationControlsProps {
  readonly className?: string;
  readonly eventId: string;
  readonly isSignedUp: boolean;
  readonly hasCancelled: boolean;
  readonly comment: string | null;
  readonly participationOpen: boolean;
  /** Replaces the sign-up form */
  readonly openInvitation?: OpenEventInvitation | null;
  readonly hasDeclinedInvitation?: boolean;
  readonly onInvitationAnswered?: () => void;
  /** See `mustApplyForEvent()` */
  readonly applicationRequired?: boolean;
  readonly ownApplication?: OwnEventApplication | null;
  /**
   * Only the sign-up dialog sets this. On the event page, the focus would
   * scroll the page and open the keyboard of a phone.
   */
  readonly autoFocusComment?: boolean;
}

export const EventParticipationControls = ({
  className,
  eventId,
  isSignedUp,
  hasCancelled,
  comment,
  participationOpen,
  openInvitation = null,
  hasDeclinedInvitation = false,
  onInvitationAnswered,
  applicationRequired = false,
  ownApplication = null,
  autoFocusComment,
}: EventParticipationControlsProps) => {
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
   * Adopts the stored comment when it changes (e.g. a fresh sign-up after a
   * cancellation), but only while the draft is untouched: a background refresh
   * would discard what the user had typed.
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
          <ParticipationState
            isSignedUp={isSignedUp}
            hasOpenInvitation={openInvitation !== null}
            hasDeclinedInvitation={hasDeclinedInvitation}
            /** A declined application says nothing while the viewer can sign up */
            applicationStatus={
              applicationRequired ? (ownApplication?.status ?? null) : null
            }
            hasCancelled={hasCancelled}
          />
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
            description={
              applicationRequired
                ? "Deine Posten in der Aufstellung und deine Bewerbungen werden dabei entfernt. Für eine erneute Teilnahme musst du die Teilnahme wieder anfragen."
                : "Deine Posten in der Aufstellung und deine Bewerbungen werden dabei entfernt."
            }
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

      {participationOpen && !isSignedUp && openInvitation && (
        <EventInvitationAnswerForm
          eventId={eventId}
          invitation={openInvitation}
          onAnswered={onInvitationAnswered}
          autoFocusComment={autoFocusComment}
          className="mt-2"
        />
      )}

      {participationOpen &&
        !isSignedUp &&
        !openInvitation &&
        applicationRequired && (
          <EventApplicationControls
            eventId={eventId}
            ownApplication={ownApplication}
            autoFocusComment={autoFocusComment}
            className="mt-2"
          />
        )}

      {participationOpen &&
        !isSignedUp &&
        !openInvitation &&
        !applicationRequired && (
          <form action={signUp.formAction} className="mt-2">
            <input type="hidden" name="eventId" value={eventId} />

            <Textarea
              name="comment"
              label="Kommentar"
              hint={`optional, max. ${EVENT_PARTICIPATION_TEXT_MAX_LENGTH} Zeichen`}
              maxLength={EVENT_PARTICIPATION_TEXT_MAX_LENGTH}
              value={signUpComment}
              onChange={(changeEvent) =>
                setSignUpComment(changeEvent.target.value)
              }
              classNameTextarea="h-20"
              autoFocus={autoFocusComment}
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
              hint={`optional, max. ${EVENT_PARTICIPATION_TEXT_MAX_LENGTH} Zeichen`}
              maxLength={EVENT_PARTICIPATION_TEXT_MAX_LENGTH}
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

interface ParticipationStateProps {
  readonly isSignedUp: boolean;
  readonly hasOpenInvitation: boolean;
  readonly hasDeclinedInvitation: boolean;
  readonly applicationStatus: EventApplicationStatus | null;
  readonly hasCancelled: boolean;
}

const ParticipationState = ({
  isSignedUp,
  hasOpenInvitation,
  hasDeclinedInvitation,
  applicationStatus,
  hasCancelled,
}: ParticipationStateProps) => {
  if (isSignedUp)
    return (
      <>
        <FaCheck className="text-green-500" />
        Zugesagt
      </>
    );

  if (hasOpenInvitation)
    return (
      <>
        <FaEnvelope className="text-yellow-500" />
        Eingeladen
      </>
    );

  if (applicationStatus === EventApplicationStatus.Open)
    return (
      <>
        <FaHourglassHalf className="text-yellow-500" />
        Teilnahme angefragt
      </>
    );

  if (applicationStatus === EventApplicationStatus.Declined)
    return (
      <>
        <FaTimes className="text-red-500" />
        Teilnahmeanfrage abgelehnt
      </>
    );

  return (
    <>
      <FaTimes className="text-red-500" />
      {hasDeclinedInvitation && "Einladung abgelehnt"}
      {!hasDeclinedInvitation &&
        (hasCancelled ? "Abgemeldet" : "Nicht angemeldet")}
    </>
  );
};
