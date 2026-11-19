"use client";

import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import clsx from "clsx";
import { useId } from "react";

interface Props {
  readonly className?: string;
  /** The field has the value `true` only while it is checked */
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly defaultChecked: boolean;
}

/**
 * A switch of the create form of an event and of the form of a template, for
 * example the participation. Uncontrolled, thus a reset of the form after an
 * action shows the value that the form sends next.
 */
export const EventSwitchField = ({
  className,
  name,
  label,
  hint,
  defaultChecked,
}: Props) => {
  const checkboxId = useId();

  return (
    <div className={clsx(className)}>
      <label htmlFor={checkboxId} className="block">
        {label}
      </label>
      <p className="mt-1 text-xs text-white/40">{hint}</p>

      <YesNoCheckbox
        id={checkboxId}
        name={name}
        value="true"
        className="mt-2"
        defaultChecked={defaultChecked}
      />
    </div>
  );
};
