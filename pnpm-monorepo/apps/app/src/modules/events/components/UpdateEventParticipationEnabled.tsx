"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import {
  AlertDialog,
  useSubmitConfirmation,
} from "@/modules/common/components/AlertDialog";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { useRef, useState, type FormEvent } from "react";
import { updateEventParticipationEnabled } from "../actions/updateEventParticipationEnabled";

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
 * The participation switch of an app event. The switch to false asks for a
 * confirmation first: it cancels all sign-ups and clears the lineup
 * assignments and applications, and the switch to true restores nothing.
 */
export const UpdateEventParticipationEnabled = ({
  className,
  eventId,
  participationEnabled,
  activeParticipantCount,
}: Props) => {
  const { isPending, formAction } = useAction(updateEventParticipationEnabled);
  const confirmation = useSubmitConfirmation();
  const [isChecked, setIsChecked] = useState(participationEnabled);
  /**
   * True after the confirm button submitted the form. The dialog closes
   * after the submission too, and then the switch must stay off.
   */
  const isConfirmedRef = useRef(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    // Only the switch to false asks for a confirmation
    if (new FormData(event.currentTarget).has("value")) return;

    confirmation.onSubmit(event);
    // The dialog opens with a prevented submission, the confirm button submits
    isConfirmedRef.current = !event.defaultPrevented;
  };

  const handleClose = () => {
    confirmation.close();
    // "Abbrechen" or Escape: the participation stays on
    if (!isConfirmedRef.current) setIsChecked(true);
  };

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className={clsx("flex items-center", className)}
    >
      <input type="hidden" name="eventId" value={eventId} />

      {/* Before the switch, thus the confirm button is the default button */}
      <AlertDialog
        isOpen={confirmation.isOpen}
        onClose={handleClose}
        title="Teilnahme abschalten?"
        description={`${getCancellationText(activeParticipantCount)} Die Zuweisungen und Bewerbungen der Aufstellung werden entfernt, die Posten bleiben erhalten. Beim Einschalten wird nichts wiederhergestellt.`}
        confirmLabel="Abschalten"
      />

      <YesNoCheckbox
        name="value"
        value="true"
        aria-label="Teilnahme"
        disabled={isPending}
        checked={isChecked}
        onChange={(changeEvent) => {
          setIsChecked(changeEvent.target.checked);
          changeEvent.target.form?.requestSubmit();
        }}
        yesLabel="Aktiviert"
        noLabel="Deaktiviert"
        labelClassName="w-auto"
      />
    </form>
  );
};
