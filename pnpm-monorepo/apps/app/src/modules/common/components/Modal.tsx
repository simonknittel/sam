"use client";

import { Dialog } from "@base-ui/react/dialog";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { FaRegTimesCircle } from "react-icons/fa";
import {
  useOptionalPopoverBaseUI,
  WithoutPopoverBaseUI,
} from "./PopoverBaseUI";

interface Props {
  readonly className?: string;
  readonly isOpen?: boolean | null;
  readonly onRequestClose?: () => void;
  readonly children?: ReactNode;
  readonly heading: ReactNode;
}

export default function Modal({
  className,
  isOpen = false,
  children,
  onRequestClose,
  heading,
}: Props) {
  const router = useRouter();
  const popover = useOptionalPopoverBaseUI();
  const isDialogOpen = Boolean(isOpen);

  /**
   * A modal in a popover (for example in a row menu of `Actions`) is a part
   * of the content of the popover. The popover stays open while the modal is
   * open.
   */
  useEffect(() => {
    if (!isDialogOpen || !popover) return;

    return popover.keepOpen();
  }, [isDialogOpen, popover]);

  const handleOpenChange = (open: boolean) => {
    if (open) return;

    if (onRequestClose) {
      onRequestClose();
    } else {
      router.back();
    }
  };

  /**
   * A modal in a popover also closes the popover, for each type of close. It
   * closes the popover only after its own close: then the focus is back on
   * the element in the popover that opened the modal, and the popover gives
   * the focus to its trigger. A modal inside this modal does not see the
   * popover.
   */
  const closePopover = (open: boolean) => {
    if (!open) popover?.closePopover();
  };

  return (
    <Dialog.Root
      open={isDialogOpen}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={closePopover}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-30 bg-neutral-800/50 backdrop-blur-sm" />

        <div className="fixed inset-0 z-30 flex cursor-pointer items-start justify-center px-4 pt-4 pb-20 lg:items-center lg:pb-4">
          <Dialog.Popup
            className={clsx(
              "max-h-full max-w-full cursor-auto overflow-auto rounded-primary bg-neutral-800 text-neutral-50 outline-hidden transition duration-200 starting:scale-90 starting:opacity-0",
              className,
            )}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-4 lg:py-4">
              <Dialog.Title
                render={<span />}
                className="font-mono text-xl font-bold text-balance uppercase"
              >
                {heading}
              </Dialog.Title>

              <Dialog.Close
                title="Schließen"
                className="relative top-1 flex-initial self-baseline px-2 text-2xl text-brand-red-500 hover:text-brand-red-300 active:text-brand-red-300 enabled:cursor-pointer"
              >
                <FaRegTimesCircle />
              </Dialog.Close>
            </div>

            <div className="p-4">
              <WithoutPopoverBaseUI>{children}</WithoutPopoverBaseUI>
            </div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
