"use client";

import { Popover } from "@base-ui/react/popover"; // eslint-disable-line no-restricted-imports
import clsx from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { IoMdArrowDropup } from "react-icons/io";
import styles from "./Popover.module.css";

interface PopoverBaseUIContext {
  closePopover: () => void;
}

const PopoverBaseUIContext = createContext<PopoverBaseUIContext | undefined>(
  undefined,
);

interface PopoverBaseUIContextProviderProps {
  readonly trigger: ReactNode;
  readonly children: ReactNode;
  readonly childrenClassName?: string;
  readonly onOpenChange?: (open: boolean) => void;
}

export const PopoverBaseUI = ({
  trigger,
  children,
  childrenClassName,
  onOpenChange,
}: PopoverBaseUIContextProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (onOpenChange) onOpenChange(open);
    },
    [onOpenChange],
  );

  const closePopover = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const value = useMemo(
    () => ({
      closePopover,
    }),
    [closePopover],
  );

  return (
    <PopoverBaseUIContext.Provider value={value}>
      <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Popover.Trigger openOnHover className="text-left">
          {trigger}
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Positioner
            sideOffset={8}
            collisionPadding={{ left: 8, right: 8 }}
            side="top"
            className="z-30"
          >
            <Popover.Popup className="z-30 outline-none" initialFocus={false}>
              <Popover.Arrow className="data-[side=bottom]:top-[-15px] data-[side=left]:right-[-13px] data-[side=left]:rotate-90 data-[side=right]:left-[-13px] data-[side=right]:-rotate-90 data-[side=top]:bottom-[-15px] data-[side=top]:rotate-180">
                <IoMdArrowDropup className="fill-neutral-700 size-6" />
              </Popover.Arrow>

              <div
                className={clsx(
                  "bg-neutral-950 border border-neutral-700 p-4 rounded-secondary",
                  styles.popover,
                  childrenClassName,
                )}
              >
                {children}
              </div>

              <div className="h-2 absolute left-0 right-0 bottom-full" />
              <div className="h-2 absolute left-0 right-0 top-full" />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </PopoverBaseUIContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function usePopoverBaseUI() {
  const context = useContext(PopoverBaseUIContext);
  if (!context) throw new Error("[PopoverContext] Provider is missing!");
  return context;
}
