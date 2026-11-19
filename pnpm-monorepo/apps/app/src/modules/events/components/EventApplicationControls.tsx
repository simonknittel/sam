"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import {
  EVENT_PARTICIPATION_TEXT_MAX_LENGTH,
  EventApplicationStatus,
} from "@sam-monorepo/domain";
import clsx from "clsx";
import { useState } from "react";
import { FaPaperPlane, FaTimes } from "react-icons/fa";
import { applyForEvent } from "../actions/applyForEvent";
import { withdrawEventApplication } from "../actions/withdrawEventApplication";

/** The latest application of the viewer, with only the fields that the controls show */
export interface OwnEventApplication {
  readonly status: EventApplicationStatus;
  /** The note of the viewer to the managers */
  readonly comment: string | null;
  /** The note of the manager to the viewer when they declined */
  readonly declineReason: string | null;
}

interface Props {
  readonly className?: string;
  readonly eventId: string;
  readonly ownApplication: OwnEventApplication | null;
  /** See `EventParticipationControls` */
  readonly autoFocusComment?: boolean;
}

/**
 * The controls of a viewer who is not signed up for an event that requires
 * applications: the application form, the open application with its
 * withdrawal, or the declined application. A declined viewer cannot apply
 * again.
 */
export const EventApplicationControls = ({
  className,
  eventId,
  ownApplication,
  autoFocusComment,
}: Props) => {
  const status = ownApplication?.status;

  switch (status) {
    case EventApplicationStatus.Open:
      return (
        <div className={clsx(className)}>
          {ownApplication?.comment && (
            <p className="border-l-2 border-neutral-700 pl-2 text-sm whitespace-pre-wrap">
              {ownApplication.comment}
            </p>
          )}

          <p className="mt-1 text-sm text-neutral-500">
            Ein Manager entscheidet über deine Teilnahmeanfrage.
          </p>

          <ConfirmActionButton
            className="mt-2 flex justify-end"
            action={withdrawEventApplication}
            hiddenFields={[{ name: "eventId", value: eventId }]}
            trigger={(isPending) => (
              <Button2
                type="submit"
                variant={Button2Variant.Secondary}
                disabled={isPending}
              >
                {isPending ? <AsciiSpinner /> : <FaTimes />}
                Anfrage zurückziehen
              </Button2>
            )}
            title="Teilnahmeanfrage zurückziehen?"
            description="Du kannst die Teilnahme danach erneut anfragen."
            confirmLabel="Zurückziehen"
          />
        </div>
      );

    case EventApplicationStatus.Declined:
      return (
        <div className={clsx(className)}>
          <p className="text-sm text-neutral-500">
            Ein Manager hat deine Teilnahmeanfrage abgelehnt.
          </p>

          {ownApplication?.declineReason && (
            <p className="mt-1 border-l-2 border-neutral-700 pl-2 text-sm whitespace-pre-wrap">
              {ownApplication.declineReason}
            </p>
          )}
        </div>
      );

    case EventApplicationStatus.Approved:
    case EventApplicationStatus.Withdrawn:
    case undefined:
      return (
        <EventApplicationForm
          className={className}
          eventId={eventId}
          autoFocusComment={autoFocusComment}
        />
      );

    default:
      throw new Error(`Unknown application status: ${status satisfies never}`);
  }
};

interface EventApplicationFormProps {
  readonly className?: string;
  readonly eventId: string;
  readonly autoFocusComment?: boolean;
}

const EventApplicationForm = ({
  className,
  eventId,
  autoFocusComment,
}: EventApplicationFormProps) => {
  /** The errors show as toasts, see `EventParticipationControls` */
  const apply = useAction(applyForEvent);

  /** Controlled, see the sign-up form of `EventParticipationControls` */
  const [comment, setComment] = useState("");

  return (
    <form action={apply.formAction} className={clsx(className)}>
      <input type="hidden" name="eventId" value={eventId} />

      <p className="text-sm text-neutral-400">
        Für dieses Event entscheidet ein Manager über deine Teilnahme.
      </p>

      <Textarea
        name="comment"
        label="Kommentar"
        hint={`optional, max. ${EVENT_PARTICIPATION_TEXT_MAX_LENGTH} Zeichen, für die Manager und später für deine Anmeldung`}
        maxLength={EVENT_PARTICIPATION_TEXT_MAX_LENGTH}
        value={comment}
        onChange={(changeEvent) => setComment(changeEvent.target.value)}
        classNameTextarea="h-20"
        autoFocus={autoFocusComment}
        className="mt-2"
      />

      <SubmitButton icon={<FaPaperPlane />} className="mt-2 ml-auto">
        Teilnahme anfragen
      </SubmitButton>
    </form>
  );
};
