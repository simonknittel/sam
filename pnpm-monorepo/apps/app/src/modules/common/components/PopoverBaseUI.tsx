"use client";

import type { PopoverRoot } from "@base-ui/react/popover"; // eslint-disable-line no-restricted-imports
import { Popover } from "@base-ui/react/popover"; // eslint-disable-line no-restricted-imports
import clsx from "clsx";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { IoMdArrowDropup } from "react-icons/io";

interface PopoverBaseUIContext {
  closePopover: () => void;
  /**
   * For example while a dialog of its content is open. Returns the function
   * that ends this hold.
   */
  keepOpen: () => () => void;
}

const PopoverBaseUIContext = createContext<PopoverBaseUIContext | undefined>(
  undefined,
);

/**
 * A dialog of the content is in a portal outside of the popup. Base UI thus
 * sees the pointer on the dialog as outside of the popover, and closes the
 * popover. This close also removes the dialog. While something holds the
 * popover open, the popover cancels each close request of Base UI.
 */
const useKeepOpen = () => {
  const holdCountRef = useRef(0);

  const keepOpen = () => {
    holdCountRef.current += 1;

    return () => {
      holdCountRef.current -= 1;
    };
  };

  const isKeptOpen = () => holdCountRef.current > 0;

  return { keepOpen, isKeptOpen };
};

interface PopoverChromeProps {
  readonly children: ReactNode;
  readonly childrenClassName?: string;
  readonly title: string;
  /**
   * Invisible strips bridging the sideOffset gap so the pointer can
   * travel from a hover trigger into the popup — omitted for detached
   * popovers, where they would swallow clicks next to the anchor.
   */
  readonly hoverBridges?: boolean;
}

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
        <IoMdArrowDropup className="size-6 fill-neutral-700" />
      </Popover.Arrow>

      {/* The pop-in is on this element, not on Popover.Popup: while the
          popup mounts, Base UI sets "transition: none" on it, and the
          transition from the starting style does not occur. Base UI
          calculates the origin on the side of the anchor. */}
      <div
        className={clsx(
          "origin-(--transform-origin) rounded-secondary border border-white/20 bg-black p-4 transition duration-200 starting:scale-90 starting:opacity-0",
          childrenClassName,
        )}
      >
        {children}
      </div>

      {hoverBridges && (
        <>
          <div className="absolute right-0 bottom-full left-0 h-2" />
          <div className="absolute top-full right-0 left-0 h-2" />
        </>
      )}
    </>
  );
};

interface PopoverBaseUIContextProviderProps {
  /**
   * Base UI renders the popup with `role="dialog"`, which is announced as an
   * unnamed dialog without a name.
   */
  readonly title: string;
  readonly trigger: ReactNode;
  readonly triggerClassName?: string;
  readonly triggerRender?: ComponentProps<typeof Popover.Trigger>["render"];
  readonly triggerTitle?: string;
  readonly children: ReactNode;
  readonly childrenClassName?: string;
  /**
   * A popover which the owner opens ignores the hover close, as after an open
   * through a press.
   */
  readonly open?: boolean;
  /** Also reports a close through `closePopover` */
  readonly onOpenChange?: (open: boolean) => void;
  /**
   * Moves the focus to the first element of the popup when it opens. Set it
   * when a different control than the trigger opened the popover, else a
   * keyboard user cannot reach the popup.
   */
  readonly moveFocusIntoPopup?: boolean;
  readonly hoverOnly?: boolean;
  readonly openOnHover?: boolean;
  readonly disabled?: boolean;
  readonly side?: "top" | "bottom" | "left" | "right";
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
  open,
  onOpenChange,
  moveFocusIntoPopup,
  hoverOnly = false,
  openOnHover = true,
  disabled = false,
  side = "top",
  align = "center",
  positionerClassName,
}: PopoverBaseUIContextProviderProps) => {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledIsOpen;

  /**
   * When the owner opens the popover through `open`, Base UI knows no open
   * event. Thus it closes the popover when the pointer leaves the trigger,
   * as after an open through hover. See `open` for the correct behaviour.
   */
  const [isOpenReported, setIsOpenReported] = useState(false);
  if (!isOpen && isOpenReported) setIsOpenReported(false);
  const isOpenedByOwner = isOpen && !isOpenReported;

  const changeOpen = (nextOpen: boolean) => {
    if (!isControlled) setUncontrolledIsOpen(nextOpen);
    setIsOpenReported(nextOpen);
    onOpenChange?.(nextOpen);
  };

  /**
   * Moving the pointer onto a hover-opening trigger already opens the popup,
   * so the click that usually follows would toggle it straight back closed —
   * the opposite of what someone reaching for the button wants. That first
   * press is swallowed; pressing again closes as expected.
   */
  const wasOpenedByHoverRef = useRef(false);

  const { keepOpen, isKeptOpen } = useKeepOpen();

  const handleOpenChange = (
    nextOpen: boolean,
    eventDetails: PopoverRoot.ChangeEventDetails,
  ) => {
    if (!nextOpen && isKeptOpen()) {
      eventDetails.cancel();
      return;
    }

    if (hoverOnly && nextOpen && eventDetails.reason !== "trigger-hover")
      return;

    if (!nextOpen && isOpenedByOwner && eventDetails.reason === "trigger-hover")
      return;

    if (
      !nextOpen &&
      wasOpenedByHoverRef.current &&
      eventDetails.reason === "trigger-press"
    ) {
      wasOpenedByHoverRef.current = false;
      return;
    }

    wasOpenedByHoverRef.current =
      nextOpen && eventDetails.reason === "trigger-hover";

    changeOpen(nextOpen);
  };

  const closePopover = () => {
    wasOpenedByHoverRef.current = false;
    changeOpen(false);
  };

  const value = {
    closePopover,
    keepOpen,
  };

  return (
    <PopoverBaseUIContext value={value}>
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
            <Popover.Popup
              className="z-30 outline-hidden"
              initialFocus={moveFocusIntoPopup ?? false}
            >
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
    </PopoverBaseUIContext>
  );
};

interface PopoverBaseUIDetachedProps {
  readonly title: string;
  readonly open: boolean;
  /**
   * `open` is fully controlled: the owner decides whether to actually close on
   * a dismissal of Base UI (outside press, Escape).
   */
  readonly onOpenChange?: (open: boolean) => void;
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
 *
 * Because the popup never takes the focus, it also does not give the focus
 * back when it closes. Otherwise it would take the focus from a dialog that
 * an entry of the popup opens.
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
  const { keepOpen, isKeptOpen } = useKeepOpen();

  const handleOpenChange = (
    nextOpen: boolean,
    eventDetails: PopoverRoot.ChangeEventDetails,
  ) => {
    if (!nextOpen && isKeptOpen()) {
      eventDetails.cancel();
      return;
    }

    onOpenChange?.(nextOpen);
  };

  const closePopover = () => {
    onOpenChange?.(false);
  };

  const value = { closePopover, keepOpen };

  return (
    <PopoverBaseUIContext value={value}>
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Portal>
          <Popover.Positioner
            anchor={anchor}
            sideOffset={8}
            collisionPadding={8}
            side={side}
            className="z-30"
          >
            <Popover.Popup
              className="z-30 outline-hidden"
              initialFocus={false}
              finalFocus={false}
            >
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
    </PopoverBaseUIContext>
  );
};

export function usePopoverBaseUI() {
  const context = useContext(PopoverBaseUIContext);
  if (!context) throw new Error("[PopoverContext] Provider is missing!");
  return context;
}

export const useOptionalPopoverBaseUI = () => useContext(PopoverBaseUIContext);

interface WithoutPopoverBaseUIProps {
  readonly children: ReactNode;
}

/**
 * Hides the popover from its children. A dialog in a popover holds the
 * popover open and closes it after its own close. A dialog inside this
 * dialog must not close the popover, because this close also removes the
 * outer dialog.
 */
export const WithoutPopoverBaseUI = ({
  children,
}: WithoutPopoverBaseUIProps) => (
  <PopoverBaseUIContext value={undefined}>{children}</PopoverBaseUIContext>
);
