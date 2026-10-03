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
        "h-11 w-full rounded-secondary border border-neutral-800 bg-neutral-900 px-4 outline-offset-4 outline-interaction-700 focus-visible:outline-2",
      )}
      {...rest}
    >
      {children}
    </select>
  );
};
