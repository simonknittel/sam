"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useHotkeys } from "react-hotkeys-hook";
import { FaRegTimesCircle } from "react-icons/fa";
import styles from "./Modal.module.css";

interface Props {
  readonly className?: string;
  readonly isOpen?: boolean | null;
  readonly onRequestClose?: () => void;
  readonly children?: ReactNode;
  readonly keepChildrenInDom?: boolean;
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
  useHotkeys("esc", onRequestClose || (() => router.back()), undefined, [
    onRequestClose,
  ]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-30 flex cursor-pointer items-start lg:items-center justify-center bg-neutral-800/50 px-4 pt-4 pb-20 lg:pb-4 backdrop-blur"
      onMouseDown={onRequestClose || (() => router.back())}
    >
      <div
        className={clsx(
          "max-h-full max-w-full cursor-auto overflow-auto rounded-primary bg-neutral-800 text-neutral-50",
          styles.modal,
          className,
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-4 lg:py-4 border-b border-white/5 flex justify-between items-center">
          <span className="text-xl font-bold">{heading}</span>

          <button
            title="Schließen"
            className="px-2 text-2xl text-brand-red-500 hover:text-brand-red-300 active:text-brand-red-300 flex-initial"
            onClick={onRequestClose || (() => router.back())}
          >
            <FaRegTimesCircle />
          </button>
        </div>

        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
