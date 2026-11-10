"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { updateEventLineupEnabled } from "../actions/updateEventLineupEnabled";

interface Props {
  readonly className?: string;
  readonly eventId: string;
  readonly lineupEnabled: boolean;
}

export const UpdateEventLineupEnabled = ({
  className,
  eventId,
  lineupEnabled,
}: Props) => {
  const { isPending, formAction } = useAction(updateEventLineupEnabled);

  return (
    <form action={formAction} className={clsx("flex items-center", className)}>
      <input type="hidden" name="eventId" value={eventId} />

      <YesNoCheckbox
        name="value"
        value="true"
        disabled={isPending}
        onChange={(e) => e.target.form?.requestSubmit()}
        defaultChecked={lineupEnabled}
        yesLabel="Aktiviert"
        noLabel="Deaktiviert"
        labelClassName="w-auto"
      />
    </form>
  );
};
