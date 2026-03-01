"use client";

import * as RadixPopover from "@radix-ui/react-popover"; // eslint-disable-line no-restricted-imports
import clsx from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  readonly hoverDelay?: number;
  readonly onOpenChange?: (open: boolean) => void;
}

export const Popover = ({
  trigger,
  children,
  childrenClassName,
  enableHover,
  hoverDelay,
  onOpenChange,
}: PopoverContextProviderProps) => {
  const [isOpen, _setIsOpen] = useState(false);

  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const setIsOpen = useCallback((open: boolean) => {
    _setIsOpen(open);
    onOpenChangeRef.current?.(open);
  }, []);

  const onEnter = useCallback(() => setIsOpen(true), [setIsOpen]);
  const onLeave = useCallback(() => setIsOpen(false), [setIsOpen]);

  const { handleMouseEnter, handleMouseLeave, reset } = useMouseEnterCounter(
    onEnter,
    onLeave,
    hoverDelay,
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
