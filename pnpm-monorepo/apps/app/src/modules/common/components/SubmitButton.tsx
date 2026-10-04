"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { AsciiSpinner } from "./AsciiSpinner";
import { Button2 } from "./Button2";

interface Props extends Omit<
  ComponentProps<typeof Button2<"button">>,
  "as" | "type"
> {
  /** The spinner replaces the icon while the form submits */
  readonly icon?: ReactNode;
}

/**
 * The submit button of a form with an `action`. While the action runs, the
 * button is disabled and shows a spinner. Put the button in the form:
 * `useFormStatus` reads only the status of the form around it. When
 * `onSubmit` calls the action itself (not through `action`), the form has no
 * status, and the button does not show it.
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
