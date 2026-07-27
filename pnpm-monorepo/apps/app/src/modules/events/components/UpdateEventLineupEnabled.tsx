"use client";

import type { Event } from "@/generated/prisma/browser";
import { useAction } from "@/modules/actions/utils/useAction";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { updateEventLineupEnabled } from "../actions/updateEventLineupEnabled";

interface Props {
  readonly className?: string;
  readonly event: Event;
}

export const UpdateEventLineupEnabled = ({ className, event }: Props) => {
  const { isPending, formAction } = useAction(updateEventLineupEnabled);

  return (
    <form action={formAction} className={clsx("flex items-center", className)}>
      <input type="hidden" name="eventId" value={event.id} />

      <YesNoCheckbox
        name="value"
        value="true"
        disabled={isPending}
        onChange={(e) => e.target.form?.requestSubmit()}
        defaultChecked={event.lineupEnabled}
        yesLabel="Aktiviert"
        noLabel="Deaktiviert"
        labelClassName="w-auto"
      />
    </form>
  );
};
