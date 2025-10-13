"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import clsx from "clsx";
import type { ComponentProps, HTMLAttributes } from "react";
import styles from "./AlertDialog.module.css";

export const AlertDialog = AlertDialogPrimitive.Root;

export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export const AlertDialogPortal = AlertDialogPrimitive.Portal;

type AlertDialogOverlayProps = ComponentProps<
  typeof AlertDialogPrimitive.Overlay
>;

export const AlertDialogOverlay = ({
  className,
  ...props
}: AlertDialogOverlayProps) => (
  <AlertDialogPrimitive.Overlay
    className={clsx(
      "fixed inset-0 z-50 bg-neutral-800/50 backdrop-blur data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
);

type AlertDialogContentProps = ComponentProps<
  typeof AlertDialogPrimitive.Content
>;

export const AlertDialogContent = ({
  className,
  ...props
}: AlertDialogContentProps) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      className={clsx(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg gap-4 p-4 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-primary bg-neutral-800 text-neutral-50",
        styles.dialog,
        className,
      )}
      {...props}
    />
  </AlertDialogPortal>
);

type AlertDialogHeaderProps = HTMLAttributes<HTMLDivElement>;

export const AlertDialogHeader = ({
  className,
  ...props
}: AlertDialogHeaderProps) => (
  <div
    className={clsx(
      "flex flex-col space-y-2 text-center sm:text-left",
      className,
    )}
    {...props}
  />
);

type AlertDialogFooterProps = HTMLAttributes<HTMLDivElement>;

export const AlertDialogFooter = ({
  className,
  ...props
}: AlertDialogFooterProps) => (
  <div
    className={clsx(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
    {...props}
  />
);

type AlertDialogContentChildrenProps = ComponentProps<
  typeof AlertDialogPrimitive.Content
>;

export const AlertDialogTitle = ({
  className,
  ...props
}: AlertDialogContentChildrenProps) => (
  <AlertDialogPrimitive.Title
    className={clsx("text-lg font-semibold", className)}
    {...props}
  />
);

type AlertDialogDescriptionProps = ComponentProps<
  typeof AlertDialogPrimitive.Description
>;

export const AlertDialogDescription = ({
  className,
  ...props
}: AlertDialogDescriptionProps) => (
  <AlertDialogPrimitive.Description
    className={clsx("text-sm", className)}
    {...props}
  />
);

type AlertDialogActionProps = ComponentProps<
  typeof AlertDialogPrimitive.Action
>;

export const AlertDialogAction = (props: AlertDialogActionProps) => {
  const { className, type, form, disabled, ...rest } = props;

  return (
    <AlertDialogPrimitive.Action
      className={clsx(
        "flex items-center justify-center rounded-secondary uppercase gap-4 min-h-11 py-2 text-base font-bold bg-brand-red-500 text-neutral-50 px-6",
        {
          "enabled:hover:bg-brand-red-300 enabled:active:bg-brand-red-300":
            !disabled,
          "opacity-50 cursor-not-allowed pointer-events-none": disabled,
        },
        className,
      )}
      onClick={
        !disabled
          ? () => {
              if (type !== "submit" || !form) return;
              // TODO: This shouldn't be necessary. I'm very confused why this doesn't work without it.
              (
                document.getElementById(form) as HTMLFormElement | null
              )?.requestSubmit();
            }
          : undefined
      }
      type={type}
      {...rest}
    />
  );
};

type AlertDialogCancelProps = ComponentProps<
  typeof AlertDialogPrimitive.Cancel
>;

export const AlertDialogCancel = ({
  className,
  ...props
}: AlertDialogCancelProps) => (
  <AlertDialogPrimitive.Cancel
    className={clsx(
      "flex items-center justify-center rounded-secondary uppercase gap-4 min-h-11 py-2 border text-base border-brand-red-500 text-brand-red-500 enabled:hover:border-brand-red-300 enabled:active:border-brand-red-300 enabled:hover:text-brand-red-300 enabled:active:text-brand-red-300 px-6 mt-2 sm:mt-0",
      className,
    )}
    {...props}
  />
);
