"use client";

import { updateEventApplicationRequired } from "../actions/updateEventApplicationRequired";
import { EventSwitchForm } from "./EventSwitchForm";

interface Props {
  readonly className?: string;
  readonly eventId: string;
  readonly applicationRequired: boolean;
}

/**
 * The switch to false approves the open applications. The text names no count,
 * because a citizen can apply after the page loaded.
 */
export const UpdateEventApplicationRequired = ({
  className,
  eventId,
  applicationRequired,
}: Props) => (
  <EventSwitchForm
    className={className}
    action={updateEventApplicationRequired}
    eventId={eventId}
    ariaLabel="Teilnahmeanfragen"
    defaultChecked={applicationRequired}
    switchOffConfirmation={{
      title: "Teilnahmeanfragen abschalten?",
      description:
        "Alle offenen Teilnahmeanfragen werden angenommen, und die Citizen werden angemeldet und benachrichtigt. Danach können sich Mitglieder direkt anmelden.",
      confirmLabel: "Abschalten",
    }}
  />
);
