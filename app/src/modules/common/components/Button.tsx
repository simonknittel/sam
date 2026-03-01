"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | null;
  colorScheme?: "interaction" | null;
  iconOnly?: boolean | null;
}

export const Button = (props: Props) => {
  const {
    variant = "primary",
    colorScheme = "interaction",
    type,
    iconOnly,
    className,
    ...other
  } = props;

  return (
    <button
      className={clsx(
        {
          "flex items-center justify-center rounded-secondary uppercase disabled:grayscale disabled:opacity-50 font-mono": true,
          "gap-2": ["primary", "secondary"].includes(variant || ""),
          "min-h-11 py-2 text-base font-bold": variant === "primary",
          "min-h-11 py-2 border text-base": variant === "secondary",
          "h-8 gap-2 text-xs": variant === "tertiary",
          "bg-interaction-500 text-neutral-50 enabled:hover:bg-interaction-300 enabled:active:bg-interaction-300":
            variant === "primary" && colorScheme === "interaction",
          "border-interaction-500 text-interaction-500 enabled:hover:border-interaction-300 enabled:active:border-interaction-300 enabled:hover:text-interaction-300 enabled:active:text-interaction-300":
            variant === "secondary" && colorScheme === "interaction",
          "text-interaction-500 border-interaction-300 enabled:hover:text-interaction-300 enabled:active:text-interaction-300":
            variant === "tertiary" && colorScheme === "interaction",
          "w-11": iconOnly && ["primary", "secondary"].includes(variant || ""),
          "w-6": iconOnly && ["tertiary"].includes(variant || ""),
          "px-6": !iconOnly && ["primary", "secondary"].includes(variant || ""),
        },
        className,
      )}
      type={type}
      {...other}
    />
  );
};

export default Button;
