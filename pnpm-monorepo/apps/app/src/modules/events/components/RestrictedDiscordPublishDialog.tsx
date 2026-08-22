"use client";

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
} from "@/modules/common/components/AlertDialog";
import type { ReactElement, ReactNode } from "react";

interface Props {
  /** Rendered via `asChild`, so it must be a single button-like element */
  readonly trigger: ReactElement;
  /** The form the confirmation submits, by id */
  readonly formId: string;
  readonly description: ReactNode;
  readonly confirmLabel: string;
}

/**
 * A restricted event is visible to selected roles in the app but to the
 * whole guild on Discord, so publishing one is never a single click. Shared
 * by the settings card and the create form — both publish, and both would
 * otherwise widen the audience without saying so.
 */
export const RestrictedDiscordPublishDialog = ({
  trigger,
  formId,
  description,
  confirmLabel,
}: Props) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>

    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          Eingeschränktes Event auf Discord veröffentlichen?
        </AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
        <AlertDialogAction type="submit" form={formId}>
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
