"use client";

import { Drawer } from "@base-ui/react/drawer";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { barItemClassName } from "./BarItemContent";

interface Props {
  /** The accessible name of the sheet */
  readonly title: string;
  /** The content of the trigger, usually a `BarItemContent` */
  readonly trigger: ReactNode;
  /** Replaces the item of the mobile action bar, for example with a button of the flyout */
  readonly triggerRender?: ComponentProps<typeof Drawer.Trigger>["render"];
  /** The `title` and the accessible name of the trigger, when its text is shorter */
  readonly triggerLabel?: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly children: ReactNode;
}

/**
 * A bottom sheet with a trigger of the mobile action bar or of its flyout, for
 * example the notification center. A swipe down closes it.
 */
export const BottomSheet = ({
  title,
  trigger,
  triggerRender,
  triggerLabel,
  open,
  onOpenChange,
  children,
}: Props) => {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Trigger
        render={triggerRender}
        className={
          triggerRender ? undefined : clsx(barItemClassName, "cursor-pointer")
        }
        title={triggerLabel}
        aria-label={triggerLabel}
      >
        {trigger}
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-50 bg-black/60 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0" />

        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end">
          <Drawer.Popup className="max-h-[80dvh] w-full [transform:translateY(var(--drawer-swipe-movement-y))] overflow-y-auto overscroll-contain rounded-t-primary bg-neutral-800 px-4 pt-2 pb-4 outline-hidden transition-transform duration-200 ease-out data-ending-style:[transform:translateY(100%)] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*200ms)] data-starting-style:[transform:translateY(100%)] data-swiping:duration-0 data-swiping:select-none">
            {/* The handle shows that a swipe moves the sheet */}
            <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-neutral-600" />

            <Drawer.Content>
              {/* Rendered as a span so naming the sheet doesn't add an entry
                  to the page's heading outline — same as Modal. */}
              <Drawer.Title render={<span />} className="sr-only">
                {title}
              </Drawer.Title>

              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
