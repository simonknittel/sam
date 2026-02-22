import clsx from "clsx";
import type {
  ComponentProps,
  ComponentPropsWithRef,
  ElementType,
  ReactNode,
} from "react";

export enum Button2Variant {
  Primary = "primary",
  Secondary = "secondary",
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
} & Omit<ComponentProps<E>, "as" | "className" | "children">;

export const Button2 = <E extends ElementType = "button">({
  as,
  className,
  children,
  variant = Button2Variant.Primary,
  colorSchema = Button2ColorSchema.Interaction,
  ...otherProps
}: Props<E>) => {
  const Component = as ?? "button";

  return (
    <Component
      className={clsx(
        "flex items-center justify-center rounded-secondary disabled:grayscale disabled:opacity-50 gap-1 min-h-8 py-1 px-2 text-sm font-normal [&>svg]:text-xs uppercase font-mono",
        {
          "bg-interaction-500 text-neutral-50 enabled:hover:bg-interaction-300 [&[href]]:hover:bg-interaction-300 enabled:focus-visible:outline [&[href]]:focus-visible:outline outline-2 outline-offset-4 outline-interaction-700 enabled:active:scale-95 [&[href]]:active:scale-95 transition-colors":
            variant === Button2Variant.Primary &&
            colorSchema === Button2ColorSchema.Interaction,
          "bg-transparent text-interaction-500 border border-interaction-500 border-solid enabled:hover:text-interaction-300 [&[href]]:hover:text-interaction-300 enabled:hover:border-interaction-300 [&[href]]:hover:border-interaction-300 enabled:focus-visible:outline [&[href]]:focus-visible:outline outline-2 outline-offset-4 outline-interaction-700 enabled:active:scale-95 [&[href]]:active:scale-95 transition-colors":
            variant === Button2Variant.Secondary &&
            colorSchema === Button2ColorSchema.Interaction,
          "bg-transparent text-neutral-500 border border-neutral-500 border-solid enabled:hover:text-interaction-300 enabled:hover:border-interaction-300 enabled:focus-visible:outline outline-2 outline-offset-4 outline-interaction-700 enabled:active:scale-95 transition-colors":
            variant === Button2Variant.Secondary &&
            colorSchema === Button2ColorSchema.InteractionMuted,
          "bg-transparent text-neutral-500 border border-neutral-500 border-solid hover:text-neutral-300 hover:border-neutral-300 focus-visible:outline outline-2 outline-offset-4 outline-neutral-700 active:scale-95 transition-colors":
            variant === Button2Variant.Secondary &&
            colorSchema === Button2ColorSchema.Discord,
          "bg-transparent text-rsi-blue-200 border border-rsi-blue-200 border-solid hover:text-rsi-blue-100 hover:border-rsi-blue-100 focus-visible:outline outline-2 outline-offset-4 outline-rsi-blue-300 active:scale-95 transition-colors":
            variant === Button2Variant.Secondary &&
            colorSchema === Button2ColorSchema.RSI,
        },
        className,
      )}
      {...(otherProps as ComponentPropsWithRef<E>)}
    >
      {children}
    </Component>
  );
};
