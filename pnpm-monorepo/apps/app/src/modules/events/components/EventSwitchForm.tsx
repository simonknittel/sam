"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { useAction } from "@/modules/actions/utils/useAction";
import {
  AlertDialog,
  useSubmitConfirmation,
} from "@/modules/common/components/AlertDialog";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { useRef, useState, type FormEvent } from "react";

interface SwitchOffConfirmation {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
}

interface Props {
  readonly className?: string;
  readonly action: (formData: FormData) => Promise<ActionResponse>;
  readonly eventId: string;
  readonly ariaLabel: string;
  readonly defaultChecked: boolean;
  readonly switchOffConfirmation: SwitchOffConfirmation;
}

/**
 * A switch of an event setting that saves at each change. The switch to
 * false asks for a confirmation first.
 */
export const EventSwitchForm = ({
  className,
  action,
  eventId,
  ariaLabel,
  defaultChecked,
  switchOffConfirmation,
}: Props) => {
  const { isPending, formAction } = useAction(action);
  const confirmation = useSubmitConfirmation();
  /**
   * "Abbrechen" mounts a new switch with the value of the page. A reset of
   * the form would change the value without React noticing (React follows
   * only the writes to the `checked` property), and the next click would
   * then send no change event.
   */
  const [switchKey, setSwitchKey] = useState(0);
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
    // "Abbrechen" or Escape: the setting stays on
    if (!isConfirmedRef.current) setSwitchKey((key) => key + 1);
  };

  /**
   * Uncontrolled: React resets the form after the action, thus the switch
   * shows the value of the page that the action refreshed
   */
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
        title={switchOffConfirmation.title}
        description={switchOffConfirmation.description}
        confirmLabel={switchOffConfirmation.confirmLabel}
      />

      <YesNoCheckbox
        key={switchKey}
        name="value"
        value="true"
        aria-label={ariaLabel}
        disabled={isPending}
        defaultChecked={defaultChecked}
        onChange={(changeEvent) => changeEvent.target.form?.requestSubmit()}
        yesLabel="Aktiviert"
        noLabel="Deaktiviert"
        labelClassName="w-auto"
      />
    </form>
  );
};
