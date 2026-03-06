"use client";

import clsx from "clsx";
import { type SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = (props: Props) => {
  const { className, children, ...rest } = props;

  return (
    <select
      className={clsx(
        className,
        "bg-neutral-900 rounded-secondary px-4 h-11 w-full focus-visible:outline-2 outline-interaction-700 outline-offset-4",
      )}
      {...rest}
    >
      {children}
    </select>
  );
};
