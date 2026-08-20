"use client";

import clsx from "clsx";
import { type InputHTMLAttributes, type ReactNode } from "react";
import { FaCheck } from "react-icons/fa";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Drops the Ja/Nein text. That text is the checkbox's STATE, never its
   * name, so hiding it leaves the input nameless unless the caller supplies
   * one — either an `aria-label` here or an own `<label htmlFor>` pointing
   * at `id`.
   */
  hideLabel?: boolean;
  yesLabel?: ReactNode;
  noLabel?: ReactNode;
  labelClassName?: string;
  id?: string;
}

export const YesNoCheckbox = (props: Props) => {
  const {
    className,
    hideLabel = false,
    yesLabel = "Ja",
    noLabel = "Nein",
    labelClassName,
    id,
    ...rest
  } = props;

  return (
    <label
      className={clsx(
        "group inline-flex justify-center gap-2 items-center align-middle",
        {
          "opacity-50 pointer-events-none": props.disabled,
          "cursor-pointer": !props.disabled,
        },
        className,
      )}
      htmlFor={id}
    >
      <input type="checkbox" className="sr-only peer" id={id} {...rest} />

      <span className="flex-none size-8 bg-neutral-700 rounded-secondary relative items-center justify-center flex peer-checked:hidden">
        <FaCheck className="text-green-500/50 size-6 hidden group-hover:block group-focus-within:block" />
      </span>

      <span className="flex-none size-8 bg-neutral-700 rounded-secondary relative items-center justify-center hidden peer-checked:flex">
        <FaCheck className="text-green-500 size-6" />
      </span>

      {!hideLabel && (
        <>
          <span
            className={clsx("w-8 block peer-checked:hidden", labelClassName)}
          >
            {noLabel}
          </span>
          <span
            className={clsx("w-8 hidden peer-checked:block", labelClassName)}
          >
            {yesLabel}
          </span>
        </>
      )}
    </label>
  );
};

export default YesNoCheckbox;
