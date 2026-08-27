"use client";

import { Button2 } from "@/modules/common/components/Button2";
import Modal from "@/modules/common/components/Modal";
import clsx from "clsx";
import { useState } from "react";
import { FaCheck, FaSignInAlt } from "react-icons/fa";
import { EventParticipationControls } from "./EventParticipationControls";

interface Props {
  readonly className?: string;
  readonly eventId: string;
  readonly eventName: string;
  readonly isSignedUp: boolean;
  readonly hasCancelled: boolean;
  readonly comment: string | null;
}

/**
 * Sign-up entry point of an event preview. The modal holds the same
 * controls as the event's own "Meine Teilnahme" tile, so signing up,
 * editing the comment and cancelling all work without leaving the
 * dashboard or the events list.
 *
 * The caller renders this only while participation is open and the viewer
 * has a citizen record — the two cases in which none of these actions can
 * succeed.
 */
export const EventParticipationButton = ({
  className,
  eventId,
  eventName,
  isSignedUp,
  hasCancelled,
  comment,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button2
        type="button"
        onClick={() => setIsOpen(true)}
        className={clsx(className)}
      >
        {isSignedUp ? <FaCheck /> : <FaSignInAlt />}
        {isSignedUp ? "Teilnahme" : "Anmelden"}
      </Button2>

      {isOpen && (
        <Modal
          isOpen={true}
          onRequestClose={() => setIsOpen(false)}
          className="w-120"
          heading={<h2>{`Teilnahme - ${eventName}`}</h2>}
        >
          <EventParticipationControls
            eventId={eventId}
            isSignedUp={isSignedUp}
            hasCancelled={hasCancelled}
            comment={comment}
            participationOpen={true}
          />
        </Modal>
      )}
    </>
  );
};
