"use client";

import { Dialog } from "@base-ui/react/dialog";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { FaRegTimesCircle } from "react-icons/fa";
import styles from "./Modal.module.css";

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

  const handleOpenChange = (open: boolean) => {
    if (open) return;

    if (onRequestClose) {
      onRequestClose();
    } else {
      router.back();
    }
  };

  return (
    <Dialog.Root open={Boolean(isOpen)} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-30 bg-neutral-800/50 backdrop-blur-sm" />

        <div className="fixed inset-0 z-30 flex cursor-pointer items-start lg:items-center justify-center px-4 pt-4 pb-20 lg:pb-4">
          <Dialog.Popup
            className={clsx(
              "max-h-full max-w-full cursor-auto overflow-auto rounded-primary bg-neutral-800 text-neutral-50 outline-hidden",
              styles.modal,
              className,
            )}
          >
            <div className="px-4 py-4 lg:py-4 border-b border-white/5 flex justify-between items-center">
              <Dialog.Title
                render={<span />}
                className="text-xl font-bold text-balance font-mono uppercase"
              >
                {heading}
              </Dialog.Title>

              <Dialog.Close
                title="Schließen"
                className="px-2 text-2xl text-brand-red-500 hover:text-brand-red-300 active:text-brand-red-300 flex-initial self-baseline relative top-1 enabled:cursor-pointer"
              >
                <FaRegTimesCircle />
              </Dialog.Close>
            </div>

            <div className="p-4">{children}</div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
