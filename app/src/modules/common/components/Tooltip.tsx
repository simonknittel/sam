import * as RadixUiTooltip from "@radix-ui/react-tooltip";
import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly contentClassName?: string;
  readonly triggerChildren: ReactNode;
  readonly children: ReactNode;
}

export const Tooltip = ({
  className,
  contentClassName,
  triggerChildren,
  children,
}: Props) => {
  return (
    <RadixUiTooltip.Provider delayDuration={0}>
      <RadixUiTooltip.Root>
        <RadixUiTooltip.Trigger
          type="button"
          className={clsx(
            "text-brand-red-500 hover:text-brand-red-300 cursor-help",
            className,
          )}
        >
          {triggerChildren}
        </RadixUiTooltip.Trigger>

        <RadixUiTooltip.Content
          className={clsx(
            "p-2 text-sm leading-tight max-w-[320px] select-none rounded-secondary bg-neutral-600 text-white font-normal",
            contentClassName,
          )}
          sideOffset={5}
        >
          {children}
          <RadixUiTooltip.Arrow className="fill-neutral-600" />
        </RadixUiTooltip.Content>
      </RadixUiTooltip.Root>
    </RadixUiTooltip.Provider>
  );
};
