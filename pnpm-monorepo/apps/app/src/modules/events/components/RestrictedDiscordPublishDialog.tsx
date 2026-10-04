"use client";

import { AlertDialog } from "@/modules/common/components/AlertDialog";
import { type ReactNode } from "react";

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly description: ReactNode;
  readonly confirmLabel: string;
}

/**
 * A restricted event is visible to selected roles in the app but to the
 * whole guild on Discord, so publishing one is never a single click. Shared
 * by the settings card and the create form — both publish, and both would
 * otherwise widen the audience without saying so. Render it inside the form
 * that it submits, and open it with `useSubmitConfirmation`.
 */
export const RestrictedDiscordPublishDialog = ({
  isOpen,
  onClose,
  description,
  confirmLabel,
}: Props) => (
  <AlertDialog
    isOpen={isOpen}
    onClose={onClose}
    title="Eingeschränktes Event auf Discord veröffentlichen?"
    description={description}
    confirmLabel={confirmLabel}
  />
);
