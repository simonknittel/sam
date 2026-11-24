"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { AsciiSpinner } from "./AsciiSpinner";
import { Button2 } from "./Button2";

interface Props extends Omit<
  ComponentProps<typeof Button2<"button">>,
  "as" | "type"
> {
  readonly icon?: ReactNode;
}

/**
 * Put the button in a form with an `action`: when `onSubmit` calls the action
 * itself, the form has no status, and the button does not show it.
 */
export const SubmitButton = ({
  icon,
  disabled,
  children,
  ...otherProps
}: Props) => {
  const { pending } = useFormStatus();

  return (
    <Button2 type="submit" disabled={pending || disabled} {...otherProps}>
      {pending ? <AsciiSpinner /> : icon}
      {children}
    </Button2>
  );
};
