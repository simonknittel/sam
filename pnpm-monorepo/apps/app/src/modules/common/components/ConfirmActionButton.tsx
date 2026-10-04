"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { useAction } from "@/modules/actions/utils/useAction";
import { type ReactElement, type ReactNode } from "react";
import { AlertDialog, useSubmitConfirmation } from "./AlertDialog";

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
   * Renders the submit button of the form (`type="submit"`). Its click opens
   * the dialog, and the action runs only after the confirmation. While the
   * action runs, `isPending` is true: the button can disable itself and show
   * a spinner.
   */
  readonly trigger: (isPending: boolean) => ReactElement;
  readonly title: string;
  readonly description: ReactNode;
  readonly confirmLabel: string;
  readonly confirmDisabled?: boolean;
  /** Dialog content between description and buttons, for example fields */
  readonly children?: ReactNode;
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
  const confirmation = useSubmitConfirmation();

  return (
    <form
      action={formAction}
      onSubmit={confirmation.onSubmit}
      className={className}
    >
      {hiddenFields?.map((field) => (
        <input
          key={field.name}
          type="hidden"
          name={field.name}
          value={field.value}
        />
      ))}

      {/**
       * The dialog comes before the trigger. Thus its confirm button is the
       * default button of the form, and Enter in a field of the dialog
       * submits only when the confirm button is enabled.
       */}
      <AlertDialog
        isOpen={confirmation.isOpen}
        onClose={confirmation.close}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        confirmDisabled={confirmDisabled}
      >
        {children}
      </AlertDialog>

      {trigger(isPending)}
    </form>
  );
};
