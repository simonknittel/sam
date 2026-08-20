"use client";

import type { PopoverRoot } from "@base-ui/react/popover"; // eslint-disable-line no-restricted-imports
import { Popover } from "@base-ui/react/popover"; // eslint-disable-line no-restricted-imports
import clsx from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
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

interface PopoverChromeProps {
  readonly children: ReactNode;
  readonly childrenClassName?: string;
  /** Accessible name of the popup, see PopoverBaseUI's `title` */
  readonly title: string;
  /**
   * Invisible strips bridging the sideOffset gap so the pointer can
   * travel from a hover trigger into the popup — omitted for detached
   * popovers, where they would swallow clicks next to the anchor.
   */
  readonly hoverBridges?: boolean;
}

/** Popup content shared by the trigger-based and the detached popover */
const PopoverChrome = ({
  children,
  childrenClassName,
  title,
  hoverBridges = false,
}: PopoverChromeProps) => {
  return (
    <>
      {/* Rendered as a span so naming the popup doesn't add an entry to the
          page's heading outline — same trade-off as Modal's Dialog.Title. */}
      <Popover.Title render={<span />} className="sr-only">
        {title}
      </Popover.Title>

      <Popover.Arrow className="data-[side=bottom]:-top-3.75 data-[side=left]:-right-3.25 data-[side=left]:rotate-90 data-[side=right]:-left-3.25 data-[side=right]:-rotate-90 data-[side=top]:-bottom-3.75 data-[side=top]:rotate-180">
        <IoMdArrowDropup className="fill-neutral-700 size-6" />
      </Popover.Arrow>

      <div
        className={clsx(
          "bg-black border border-white/20 p-4 rounded-secondary",
          styles.popover,
          childrenClassName,
        )}
      >
        {children}
      </div>

      {hoverBridges && (
        <>
          <div className="h-2 absolute left-0 right-0 bottom-full" />
          <div className="h-2 absolute left-0 right-0 top-full" />
        </>
      )}
    </>
  );
};

interface PopoverBaseUIContextProviderProps {
  /**
   * Accessible name of the popup. Base UI renders the popup with
   * `role="dialog"`, which is announced as an unnamed dialog without one.
   * Required so a new popover can't silently ship without a name.
   */
  readonly title: string;
  readonly trigger: ReactNode;
  /** Applied to the button element Base UI renders around `trigger` */
  readonly triggerClassName?: string;
  /**
   * Element to render the trigger as (Base UI `render` prop), e.g. a
   * `Button2` — used instead of the default unstyled button.
   */
  readonly triggerRender?: ComponentProps<typeof Popover.Trigger>["render"];
  /** Tooltip and accessible name of the trigger button (for icon-only triggers) */
  readonly triggerTitle?: string;
  readonly children: ReactNode;
  readonly childrenClassName?: string;
  readonly onOpenChange?: (open: boolean) => void;
  /**
   * When true, the popover only opens on mouse hover.
   * Click and touch interactions are ignored.
   */
  readonly hoverOnly?: boolean;
  /** When false, hovering the trigger doesn't open the popover (click only) */
  readonly openOnHover?: boolean;
  /** When true, the trigger is inert and the popover cannot open */
  readonly disabled?: boolean;
  readonly side?: "top" | "bottom" | "left" | "right";
  /** Where the popup sits along the trigger's edge */
  readonly align?: "start" | "center" | "end";
  /**
   * Replaces the positioner's default `z-30` — for popovers which must
   * stack above higher surfaces, e.g. the mobile flyout (`z-50`).
   */
  readonly positionerClassName?: string;
}

export const PopoverBaseUI = ({
  title,
  trigger,
  triggerClassName,
  triggerRender,
  triggerTitle,
  children,
  childrenClassName,
  onOpenChange,
  hoverOnly = false,
  openOnHover = true,
  disabled = false,
  side = "top",
  align = "center",
  positionerClassName,
}: PopoverBaseUIContextProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Moving the pointer onto a hover-opening trigger already opens the popup,
   * so the click that usually follows would toggle it straight back closed —
   * the opposite of what someone reaching for the button wants. That first
   * press is swallowed; pressing again closes as expected.
   */
  const wasOpenedByHoverRef = useRef(false);

  const handleOpenChange = useCallback(
    (open: boolean, eventDetails: PopoverRoot.ChangeEventDetails) => {
      if (hoverOnly && open && eventDetails.reason !== "trigger-hover") return;

      if (
        !open &&
        wasOpenedByHoverRef.current &&
        eventDetails.reason === "trigger-press"
      ) {
        wasOpenedByHoverRef.current = false;
        return;
      }

      wasOpenedByHoverRef.current =
        open && eventDetails.reason === "trigger-hover";

      setIsOpen(open);
      onOpenChange?.(open);
    },
    [onOpenChange, hoverOnly],
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
      <Popover.Root open={!disabled && isOpen} onOpenChange={handleOpenChange}>
        <Popover.Trigger
          render={triggerRender}
          openOnHover={openOnHover}
          className={clsx("text-left", triggerClassName)}
          delay={50}
          disabled={disabled}
          title={triggerTitle}
          aria-label={triggerTitle}
        >
          {trigger}
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Positioner
            sideOffset={8}
            collisionPadding={{ left: 8, right: 8 }}
            side={side}
            align={align}
            className={positionerClassName ?? "z-30"}
          >
            <Popover.Popup className="z-30 outline-hidden" initialFocus={false}>
              <PopoverChrome
                title={title}
                childrenClassName={childrenClassName}
                hoverBridges
              >
                {children}
              </PopoverChrome>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </PopoverBaseUIContext.Provider>
  );
};

interface PopoverBaseUIDetachedProps {
  /** Accessible name of the popup, see PopoverBaseUI's `title` */
  readonly title: string;
  readonly open: boolean;
  /**
   * Reports Base UI's own dismissals (outside press, Escape). `open` is
   * fully controlled — the owner decides whether to actually close.
   */
  readonly onOpenChange?: (open: boolean) => void;
  /** Element or virtual element (e.g. a caret rect) the popup anchors to */
  readonly anchor: ComponentProps<typeof Popover.Positioner>["anchor"];
  readonly children: ReactNode;
  readonly childrenClassName?: string;
  readonly side?: "top" | "bottom" | "left" | "right";
}

/**
 * Popover without a trigger element, positioned against an anchor — for
 * popups tied to something that is not a DOM element, like the wiki
 * editor's caret (suggestion menus). Same chrome and collision handling
 * (flip at viewport edges) as PopoverBaseUI, but never opens itself and
 * never takes focus.
 */
export const PopoverBaseUIDetached = ({
  title,
  open,
  onOpenChange,
  anchor,
  children,
  childrenClassName,
  side = "bottom",
}: PopoverBaseUIDetachedProps) => {
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  const closePopover = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  const value = useMemo(() => ({ closePopover }), [closePopover]);

  return (
    <PopoverBaseUIContext.Provider value={value}>
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Portal>
          <Popover.Positioner
            anchor={anchor}
            sideOffset={8}
            collisionPadding={8}
            side={side}
            className="z-30"
          >
            <Popover.Popup className="z-30 outline-hidden" initialFocus={false}>
              <PopoverChrome
                title={title}
                childrenClassName={childrenClassName}
              >
                {children}
              </PopoverChrome>
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
