"use client";

import { Button2 } from "@/modules/common/components/Button2";
import { EventApplicationStatus } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useState } from "react";
import {
  FaCheck,
  FaEnvelope,
  FaHourglassHalf,
  FaPaperPlane,
  FaSignInAlt,
  FaTimes,
} from "react-icons/fa";
import type { OwnEventApplication } from "./EventApplicationControls";
import type { OpenEventInvitation } from "./EventInvitationAnswerForm";
import { EventParticipationModal } from "./EventParticipationModal";

interface Props {
  readonly className?: string;
  readonly eventId: string;
  readonly eventName: string;
  readonly isSignedUp: boolean;
  readonly hasCancelled: boolean;
  readonly comment: string | null;
  readonly openInvitation: OpenEventInvitation | null;
  readonly applicationRequired: boolean;
  readonly ownApplication: OwnEventApplication | null;
}

interface ButtonContentProps {
  readonly isSignedUp: boolean;
  readonly isInvited: boolean;
  readonly applicationRequired: boolean;
  readonly ownApplication: OwnEventApplication | null;
}

const ButtonContent = ({
  isSignedUp,
  isInvited,
  applicationRequired,
  ownApplication,
}: ButtonContentProps) => {
  if (isSignedUp)
    return (
      <>
        <FaCheck />
        Teilnahme
      </>
    );

  // The invitation signs the viewer up without an application
  if (isInvited)
    return (
      <>
        <FaEnvelope />
        Eingeladen
      </>
    );

  if (!applicationRequired)
    return (
      <>
        <FaSignInAlt />
        Anmelden
      </>
    );

  const status = ownApplication?.status;

  switch (status) {
    case EventApplicationStatus.Open:
      return (
        <>
          <FaHourglassHalf />
          Angefragt
        </>
      );

    case EventApplicationStatus.Declined:
      return (
        <>
          <FaTimes />
          Abgelehnt
        </>
      );

    case EventApplicationStatus.Approved:
    case EventApplicationStatus.Withdrawn:
    case undefined:
      return (
        <>
          <FaPaperPlane />
          Anfragen
        </>
      );

    default:
      throw new Error(`Unknown application status: ${status satisfies never}`);
  }
};

/**
 * The caller renders this only while participation is open and the viewer has a
 * citizen record — otherwise none of these actions can succeed.
 */
export const EventParticipationButton = ({
  className,
  eventId,
  eventName,
  isSignedUp,
  hasCancelled,
  comment,
  openInvitation,
  applicationRequired,
  ownApplication,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button2
        type="button"
        onClick={() => setIsOpen(true)}
        className={clsx(className)}
      >
        <ButtonContent
          isSignedUp={isSignedUp}
          isInvited={openInvitation !== null}
          applicationRequired={applicationRequired}
          ownApplication={ownApplication}
        />
      </Button2>

      {isOpen && (
        <EventParticipationModal
          eventId={eventId}
          eventName={eventName}
          isSignedUp={isSignedUp}
          hasCancelled={hasCancelled}
          comment={comment}
          openInvitation={openInvitation}
          applicationRequired={applicationRequired}
          ownApplication={ownApplication}
          onRequestClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
