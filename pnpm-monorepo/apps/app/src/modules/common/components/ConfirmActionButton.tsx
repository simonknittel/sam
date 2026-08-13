"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { useAction } from "@/modules/actions/utils/useAction";
import { useId, type ReactElement, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./AlertDialog";
import { AsciiSpinner } from "./AsciiSpinner";

interface HiddenField {
  readonly name: string;
  readonly value: string;
}

interface Props {
  readonly className?: string;
  /**
   * Server action, or a `useAction`-compatible client handler for the
   * legacy REST mutations that have not been migrated to actions yet.
   */
  readonly action: (formData: FormData) => Promise<ActionResponse | void>;
  readonly hiddenFields?: readonly HiddenField[];
  /**
   * Renders the button opening the dialog. Receives the pending state so it
   * can disable itself and show a spinner while the action runs. Rendered
   * via `asChild`, so it must be a single button-like element.
   */
  readonly trigger: (isPending: boolean) => ReactElement;
  readonly title: string;
  readonly description: ReactNode;
  readonly confirmLabel: string;
  readonly confirmDisabled?: boolean;
  /**
   * Extra dialog content between description and footer, e.g. additional
   * form fields. The dialog renders in a portal outside the form element,
   * so form fields must reference the form via the provided id.
   */
  readonly children?: ReactNode | ((formId: string) => ReactNode);
  readonly onSuccess?: () => void;
}

/**
 * A button that runs a server action only after the user confirmed it in a
 * dialog. Results surface through the app-wide toasts of `useAction`.
 */
export const ConfirmActionButton = ({
  className,
  action,
  hiddenFields,
  trigger,
  title,
  description,
  confirmLabel,
  confirmDisabled,
  children,
  onSuccess,
}: Props) => {
  const { formAction, isPending } = useAction(action, {
    onSuccess: onSuccess ? () => onSuccess() : undefined,
  });
  const formId = useId();

  return (
    <form action={formAction} id={formId} className={className}>
      {hiddenFields?.map((field) => (
        <input
          key={field.name}
          type="hidden"
          name={field.name}
          value={field.value}
        />
      ))}

      <AlertDialog>
        <AlertDialogTrigger asChild>{trigger(isPending)}</AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>

          {typeof children === "function" ? children(formId) : children}

          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>

            <AlertDialogAction
              type="submit"
              form={formId}
              disabled={confirmDisabled}
            >
              {isPending && <AsciiSpinner />}
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};
