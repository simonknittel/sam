import { VariantWithLogo } from "@/modules/fleet/components/VariantWithLogo";
import * as Tooltip from "@radix-ui/react-tooltip";
import clsx from "clsx";
import type { PositionType } from "./Position";

interface Props {
  readonly className?: string;
  readonly position: PositionType;
}

export const PositionVariants = ({ className, position }: Props) => {
  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger
          className={clsx(
            "cursor-default hover:bg-neutral-700 rounded-secondary flex gap-2 items-center",
            className,
          )}
        >
          <VariantWithLogo
            key={position.requiredVariants[0].id}
            variant={position.requiredVariants[0].variant}
            manufacturer={
              position.requiredVariants[0].variant.series.manufacturer
            }
            size={32}
          />

          <span className="rounded-full bg-neutral-900 size-6 flex items-center justify-center text-xs border border-brand-red-500">
            +{position.requiredVariants.length - 1}
          </span>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            className="px-4 py-2 max-w-[320px] select-none rounded-secondary bg-neutral-950 border border-brand-red-500 text-white font-normal"
            sideOffset={5}
          >
            <p className="text-sm text-gray-500">Alternativen</p>

            {position.requiredVariants.map((requiredVariant) => (
              <VariantWithLogo
                key={requiredVariant.id}
                variant={requiredVariant.variant}
                manufacturer={requiredVariant.variant.series.manufacturer}
                size={32}
              />
            ))}
            <Tooltip.Arrow className="fill-brand-red-500" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
