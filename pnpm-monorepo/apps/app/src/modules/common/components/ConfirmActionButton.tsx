"use client";

import type { ActionResponse } from "@/modules/actions/utils/createAction";
import { useAction } from "@/modules/actions/utils/useAction";
import { useState, type ReactElement, type ReactNode } from "react";
import { AlertDialog } from "./AlertDialog";

interface HiddenField {
  readonly name: string;
  readonly value: string;
}

interface TriggerRenderProps {
  readonly isPending: boolean;
  readonly openDialog: () => void;
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
   * Renders the button that opens the dialog. The button must have
   * `type="button"` and `onClick={openDialog}`. While the action runs,
   * `isPending` is true: the button can disable itself and show a spinner.
   */
  readonly trigger: (renderProps: TriggerRenderProps) => ReactElement;
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <form action={formAction} className={className}>
      {hiddenFields?.map((field) => (
        <input
          key={field.name}
          type="hidden"
          name={field.name}
          value={field.value}
        />
      ))}

      {trigger({ isPending, openDialog: () => setIsDialogOpen(true) })}

      <AlertDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        confirmDisabled={confirmDisabled}
      >
        {children}
      </AlertDialog>
    </form>
  );
};
