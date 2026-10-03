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
        "group inline-flex items-center justify-center gap-2 align-middle",
        {
          "pointer-events-none opacity-50": props.disabled,
          "cursor-pointer": !props.disabled,
        },
        className,
      )}
      htmlFor={id}
    >
      <input type="checkbox" className="peer sr-only" id={id} {...rest} />

      <span className="relative flex size-8 flex-none items-center justify-center rounded-secondary bg-neutral-700 peer-checked:hidden">
        <FaCheck className="hidden size-6 text-green-500/50 group-focus-within:block group-hover:block" />
      </span>

      <span className="relative hidden size-8 flex-none items-center justify-center rounded-secondary bg-neutral-700 peer-checked:flex">
        <FaCheck className="size-6 text-green-500" />
      </span>

      {!hideLabel && (
        <>
          <span
            className={clsx("block w-8 peer-checked:hidden", labelClassName)}
          >
            {noLabel}
          </span>
          <span
            className={clsx("hidden w-8 peer-checked:block", labelClassName)}
          >
            {yesLabel}
          </span>
        </>
      )}
    </label>
  );
};

export default YesNoCheckbox;
