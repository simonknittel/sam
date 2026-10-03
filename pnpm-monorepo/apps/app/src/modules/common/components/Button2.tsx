import clsx from "clsx";
import type { ComponentProps, ElementType, ReactNode } from "react";
import { Tooltip } from "./Tooltip";

export enum Button2Variant {
  Primary = "primary",
  Secondary = "secondary",
  IconOnly = "iconOnly",
}

export enum Button2ColorSchema {
  Interaction = "interaction",
  InteractionMuted = "interactionMuted",
  Discord = "discord",
  RSI = "rsi",
}

type Props<E extends ElementType = "button"> = {
  readonly as?: E;
  readonly className?: string;
  readonly children?: ReactNode;
  readonly variant?: Button2Variant;
  readonly colorSchema?: Button2ColorSchema | null;
  /**
   * Label shown as a tooltip above the button on hover/focus. Also serves as
   * the accessible name, so icon-only buttons don't need a `title` attribute.
   */
  readonly tooltip?: string;
  /**
   * Key that triggers the button, shown as a badge inside the tooltip. Left
   * out of the accessible name — use `aria-keyshortcuts` for that.
   */
  readonly tooltipHotkey?: string;
} & Omit<ComponentProps<E>, "as" | "className" | "children">;

export const Button2 = <E extends ElementType = "button">({
  as,
  className,
  children,
  variant = Button2Variant.Primary,
  colorSchema = Button2ColorSchema.Interaction,
  tooltip,
  tooltipHotkey,
  ...otherProps
}: Props<E>) => {
  const Component = as ?? "button";

  const button = (
    <Component
      className={clsx(
        "flex min-h-8 items-center justify-center gap-1 rounded-secondary font-mono text-sm font-normal uppercase not-disabled:cursor-pointer disabled:opacity-50 disabled:grayscale",
        {
          "min-w-8 [&>svg]:text-sm": variant === Button2Variant.IconOnly,
          "px-2 py-1 [&>svg]:text-xs": variant !== Button2Variant.IconOnly,
          "bg-transparent text-neutral-500 transition-colors enabled:hover:text-interaction-500 enabled:focus-visible:text-interaction-500 enabled:active:scale-95 [[href]]:hover:text-interaction-500 [[href]]:focus-visible:text-interaction-500 [[href]]:active:scale-95":
            variant === Button2Variant.IconOnly &&
            colorSchema === Button2ColorSchema.Interaction,
          "bg-interaction-500 text-neutral-50 outline-offset-4 outline-interaction-700 transition-colors enabled:hover:bg-interaction-300 enabled:focus-visible:outline-2 enabled:active:scale-95 [[href]]:hover:bg-interaction-300 [[href]]:focus-visible:outline-2 [[href]]:active:scale-95":
            variant === Button2Variant.Primary &&
            colorSchema === Button2ColorSchema.Interaction,
          "border border-solid border-interaction-500 bg-transparent text-interaction-500 outline-offset-4 outline-interaction-700 transition-colors enabled:hover:border-interaction-300 enabled:hover:text-interaction-300 enabled:focus-visible:outline-2 enabled:active:scale-95 [[href]]:hover:border-interaction-300 [[href]]:hover:text-interaction-300 [[href]]:focus-visible:outline-2 [[href]]:active:scale-95":
            variant === Button2Variant.Secondary &&
            colorSchema === Button2ColorSchema.Interaction,
          "border border-solid border-neutral-500 bg-transparent text-neutral-500 outline-offset-4 outline-interaction-700 transition-colors enabled:hover:border-interaction-300 enabled:hover:text-interaction-300 enabled:focus-visible:outline-2 enabled:active:scale-95":
            variant === Button2Variant.Secondary &&
            colorSchema === Button2ColorSchema.InteractionMuted,
          "border border-solid border-neutral-500 bg-transparent text-neutral-500 outline-offset-4 outline-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-300 focus-visible:outline-2 active:scale-95":
            variant === Button2Variant.Secondary &&
            colorSchema === Button2ColorSchema.Discord,
          "border border-solid border-rsi-blue-200 bg-transparent text-rsi-blue-200 outline-offset-4 outline-rsi-blue-300 transition-colors hover:border-rsi-blue-100 hover:text-rsi-blue-100 focus-visible:outline-2 active:scale-95":
            variant === Button2Variant.Secondary &&
            colorSchema === Button2ColorSchema.RSI,
        },
        className,
      )}
      {...otherProps}
    >
      {children}

      {/* Names the button — the tooltip itself is only its description */}
      {tooltip && <span className="sr-only">{tooltip}</span>}
    </Component>
  );

  if (!tooltip) return button;

  /*
    The shared tooltip rather than an absolutely positioned span: that span
    stayed inside the button's containing block, so a button near the right
    edge of the page — the last cell of a row, say — widened the document and
    gave the whole page a horizontal scrollbar while hovered. This one is
    fixed-positioned and collision-aware, so it never grows the page and
    shifts or flips instead of leaving the viewport.
  */
  return (
    <Tooltip
      asChild
      side="top"
      triggerChildren={button}
      contentClassName="z-20"
    >
      {tooltip}

      {tooltipHotkey && (
        <kbd className="ml-1.5 rounded-secondary bg-white/15 px-1 py-0.5 font-mono text-[0.625rem] uppercase">
          {tooltipHotkey}
        </kbd>
      )}
    </Tooltip>
  );
};
