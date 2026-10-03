"use client";

import { AlertDialog } from "@/modules/common/components/AlertDialog";
import { useState, type ReactNode } from "react";

interface Props {
  /**
   * Renders the button that opens the dialog. The button must have
   * `type="button"` and `onClick={openDialog}`.
   */
  readonly trigger: (openDialog: () => void) => ReactNode;
  readonly description: ReactNode;
  readonly confirmLabel: string;
}

/**
 * A restricted event is visible to selected roles in the app but to the
 * whole guild on Discord, so publishing one is never a single click. Shared
 * by the settings card and the create form — both publish, and both would
 * otherwise widen the audience without saying so. Render it inside the form
 * that it submits.
 */
export const RestrictedDiscordPublishDialog = ({
  trigger,
  description,
  confirmLabel,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {trigger(() => setIsOpen(true))}

      <AlertDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Eingeschränktes Event auf Discord veröffentlichen?"
        description={description}
        confirmLabel={confirmLabel}
      />
    </>
  );
};
