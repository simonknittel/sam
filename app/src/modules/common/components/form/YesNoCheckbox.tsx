"use client";

import clsx from "clsx";
import { type InputHTMLAttributes, type ReactNode } from "react";
import { FaCheck } from "react-icons/fa";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  hideLabel?: boolean;
  yesLabel?: ReactNode;
  noLabel?: ReactNode;
  labelClassName?: string;
}

export const YesNoCheckbox = (props: Props) => {
  const {
    className,
    hideLabel = false,
    yesLabel = "Ja",
    noLabel = "Nein",
    labelClassName,
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
    >
      <input type="checkbox" className="hidden peer" {...rest} />

      <span className="flex-none size-8 bg-neutral-700 rounded-secondary block relative peer-checked:hidden">
        <span className="absolute inset-0 flex items-center justify-center hidden group-hover:block">
          <FaCheck className="text-green-500/50 size-4" />
        </span>
      </span>

      <span className="flex-none size-8 bg-neutral-700 rounded-secondary hidden relative peer-checked:flex items-center justify-center">
        <FaCheck className="text-green-500 size-4" />
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
