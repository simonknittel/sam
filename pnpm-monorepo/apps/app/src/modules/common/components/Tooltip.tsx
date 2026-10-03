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
                "cursor-help font-mono text-brand-red-500 uppercase hover:underline focus-visible:underline",
                className,
              )
        }
      >
        {triggerChildren}
      </RadixUiTooltip.Trigger>

      <RadixUiTooltip.Content
        className={clsx(
          "max-w-[320px] rounded-secondary bg-neutral-600 p-2 text-sm leading-tight font-normal text-white select-none",
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
