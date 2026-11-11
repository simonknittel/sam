"use client";

import Modal from "@/modules/common/components/Modal";
import {
  EventParticipationControls,
  type EventParticipationControlsProps,
} from "./EventParticipationControls";

interface Props extends Omit<
  EventParticipationControlsProps,
  "className" | "participationOpen" | "autoFocusComment"
> {
  readonly eventName: string;
  readonly onRequestClose: () => void;
}

/**
 * The controls of the own participation in a modal, for the sign-up of an
 * event preview and for the answer to an invitation in its notification. The
 * caller mounts it only while it is open, thus the comment gets the focus at
 * each opening. The caller shows it only while the participation is open.
 */
export const EventParticipationModal = ({
  eventName,
  onRequestClose,
  ...controlsProps
}: Props) => (
  <Modal
    isOpen={true}
    onRequestClose={onRequestClose}
    className="w-120"
    heading={<h2>{`Teilnahme - ${eventName}`}</h2>}
  >
    <EventParticipationControls
      {...controlsProps}
      participationOpen={true}
      autoFocusComment
    />
  </Modal>
);
