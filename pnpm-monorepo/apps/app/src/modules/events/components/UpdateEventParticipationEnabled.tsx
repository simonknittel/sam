"use client";

import { updateEventParticipationEnabled } from "../actions/updateEventParticipationEnabled";
import { EventSwitchForm } from "./EventSwitchForm";

interface Props {
  readonly className?: string;
  readonly eventId: string;
  readonly participationEnabled: boolean;
  /** The active sign-ups that the switch to false cancels */
  readonly activeParticipantCount: number;
}

const getCancellationText = (activeParticipantCount: number) => {
  if (activeParticipantCount <= 0)
    return "Das Event hat keine aktiven Anmeldungen.";
  if (activeParticipantCount === 1)
    return "1 aktive Anmeldung wird storniert, und der Teilnehmer wird benachrichtigt.";

  return `${activeParticipantCount} aktive Anmeldungen werden storniert, und die Teilnehmer werden benachrichtigt.`;
};

/**
 * The switch to false cancels all sign-ups and clears the lineup assignments
 * and applications, and the switch to true restores nothing.
 */
export const UpdateEventParticipationEnabled = ({
  className,
  eventId,
  participationEnabled,
  activeParticipantCount,
}: Props) => (
  <EventSwitchForm
    className={className}
    action={updateEventParticipationEnabled}
    eventId={eventId}
    ariaLabel="Teilnahme"
    defaultChecked={participationEnabled}
    switchOffConfirmation={{
      title: "Teilnahme abschalten?",
      description: `${getCancellationText(activeParticipantCount)} Offene Einladungen und Teilnahmeanfragen werden zurückgezogen. Die Zuweisungen und Bewerbungen der Aufstellung werden entfernt, die Posten bleiben erhalten. Beim Einschalten wird nichts wiederhergestellt.`,
      confirmLabel: "Abschalten",
    }}
  />
);
