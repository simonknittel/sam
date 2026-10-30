"use client";

import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { useId } from "react";

interface Props {
  readonly className?: string;
  readonly hint: string;
  readonly defaultChecked: boolean;
}

/**
 * The participation switch of the create form of an event and of the form
 * of a template. The field `participationEnabled` has a value only while it
 * is checked. Uncontrolled, thus a reset of the form after an action shows
 * the value that the form sends next.
 */
export const EventParticipationField = ({
  className,
  hint,
  defaultChecked,
}: Props) => {
  const checkboxId = useId();

  return (
    <div className={clsx(className)}>
      <label htmlFor={checkboxId} className="block">
        Teilnahme
      </label>
      <p className="mt-1 text-xs text-white/40">{hint}</p>

      <YesNoCheckbox
        id={checkboxId}
        name="participationEnabled"
        value="true"
        className="mt-2"
        defaultChecked={defaultChecked}
      />
    </div>
  );
};
