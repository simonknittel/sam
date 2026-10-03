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
  readonly onOpenChange?: (open: boolean) => void;
}

/**
 * @deprecated Use `PopoverBaseUI` instead — this Radix-based popover is only
 * kept for its remaining usages and should not be used for new code.
 */
export const Popover = ({
  trigger,
  children,
  childrenClassName,
  enableHover,
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
            className="z-30 outline-hidden"
            onMouseEnter={enableHover ? handleMouseEnter : undefined}
            onMouseLeave={enableHover ? handleMouseLeave : undefined}
            side="top"
          >
            <div
              className={clsx(
                "rounded-secondary border border-neutral-700 bg-neutral-950 p-4",
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
                <div className="absolute right-0 bottom-full left-0 h-2" />
                <div className="absolute top-full right-0 left-0 h-2" />
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
 *
 * @deprecated Use `usePopoverBaseUI` (with `PopoverBaseUI`) instead.
 */
export function usePopover() {
  const context = useContext(PopoverContext);
  if (!context) throw new Error("[PopoverContext] Provider is missing!");
  return context;
}
