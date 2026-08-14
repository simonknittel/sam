import * as RadixUiTooltip from "@radix-ui/react-tooltip"; // eslint-disable-line no-restricted-imports
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

interface TooltipProviderProps {
  readonly children: ReactNode;
}

/**
 * App-wide tooltip context, rendered once in the root layout so each
 * Tooltip instance doesn't have to carry its own provider.
 */
export const TooltipProvider = ({ children }: TooltipProviderProps) => {
  return (
    <RadixUiTooltip.Provider delayDuration={0}>
      {children}
    </RadixUiTooltip.Provider>
  );
};

interface Props extends Omit<
  ComponentProps<typeof RadixUiTooltip.Trigger>,
  "children" | "asChild"
> {
  readonly contentClassName?: string;
  readonly triggerChildren: ReactNode;
  readonly children: ReactNode;
  /**
   * Turns `triggerChildren` itself into the trigger instead of wrapping it in
   * another button. Required whenever the trigger already is an interactive
   * element.
   */
  readonly asChild?: boolean;
  readonly side?: ComponentProps<typeof RadixUiTooltip.Content>["side"];
  readonly sideOffset?: number;
  /**
   * Controls the tooltip programmatically instead of by hover/focus — for
   * confirmation bubbles like CopyToClipboard. Leave undefined for the
   * regular hover behavior.
   */
  readonly open?: boolean;
}

export const Tooltip = ({
  className,
  contentClassName,
  triggerChildren,
  children,
  asChild,
  side,
  sideOffset = 5,
  open,
  ...triggerProps
}: Props) => {
  return (
    <RadixUiTooltip.Root open={open}>
      <RadixUiTooltip.Trigger
        {...triggerProps}
        {...(asChild ? { asChild: true } : { type: "button" as const })}
        className={
          asChild
            ? className
            : clsx(
                "text-brand-red-500 hover:underline focus-visible:underline font-mono uppercase cursor-help",
                className,
              )
        }
      >
        {triggerChildren}
      </RadixUiTooltip.Trigger>

      <RadixUiTooltip.Content
        className={clsx(
          "p-2 text-sm leading-tight max-w-[320px] select-none rounded-secondary bg-neutral-600 text-white font-normal",
          contentClassName,
        )}
        side={side}
        sideOffset={sideOffset}
      >
        {children}
        <RadixUiTooltip.Arrow className="fill-neutral-600" />
      </RadixUiTooltip.Content>
    </RadixUiTooltip.Root>
  );
};
