"use client";

import * as RadixPopover from "@radix-ui/react-popover"; // eslint-disable-line no-restricted-imports
import clsx from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMouseEnterCounter } from "../utils/useMouseEnterCounter";
import styles from "./Popover.module.css";

interface PopoverContext {
  closePopover: () => void;
}

const PopoverContext = createContext<PopoverContext | undefined>(undefined);

interface PopoverContextProviderProps {
  readonly trigger: ReactNode;
  readonly children: ReactNode;
  readonly childrenClassName?: string;
  readonly enableHover?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export const Popover = ({
  trigger,
  children,
  childrenClassName,
  enableHover,
  onOpenChange,
}: PopoverContextProviderProps) => {
  const [isOpen, _setIsOpen] = useState(false);

  const setIsOpen = useCallback(
    (open: boolean) => {
      _setIsOpen(open);
      onOpenChange?.(open);
    },
    [onOpenChange],
  );

  const { handleMouseEnter, handleMouseLeave, reset } = useMouseEnterCounter(
    setIsOpen.bind(null, true),
    setIsOpen.bind(null, false),
  );

  const closePopover = useCallback(() => {
    setIsOpen(false);
    reset();
  }, [setIsOpen, reset]);

  const value = useMemo(
    () => ({
      closePopover,
    }),
    [closePopover],
  );

  return (
    <PopoverContext.Provider value={value}>
      <RadixPopover.Root open={isOpen} onOpenChange={setIsOpen}>
        <RadixPopover.Trigger
          asChild
          onMouseEnter={enableHover ? handleMouseEnter : undefined}
          onMouseLeave={enableHover ? handleMouseLeave : undefined}
        >
          {trigger}
        </RadixPopover.Trigger>

        <RadixPopover.Portal>
          <RadixPopover.Content
            collisionPadding={{ left: 8, right: 8 }}
            className="z-30 outline-none"
            onMouseEnter={enableHover ? handleMouseEnter : undefined}
            onMouseLeave={enableHover ? handleMouseLeave : undefined}
            side="top"
          >
            <div
              className={clsx(
                "bg-neutral-950 border border-neutral-700 p-4 rounded-secondary",
                styles.popover,
                {
                  relative: enableHover,
                },
                childrenClassName,
              )}
            >
              {children}
            </div>

            {enableHover && (
              <>
                <div className="h-2 absolute left-0 right-0 bottom-full" />
                <div className="h-2 absolute left-0 right-0 top-full" />
              </>
            )}

            <RadixPopover.Arrow className="fill-neutral-700" />
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </RadixPopover.Root>
    </PopoverContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function usePopover() {
  const context = useContext(PopoverContext);
  if (!context) throw new Error("[PopoverContext] Provider is missing!");
  return context;
}
