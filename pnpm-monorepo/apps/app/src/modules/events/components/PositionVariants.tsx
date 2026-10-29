import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { VariantWithLogo } from "@/modules/fleet/components/VariantWithLogo";
import clsx from "clsx";
import type { PositionType } from "./Position";

interface Props {
  readonly className?: string;
  readonly position: PositionType;
}

/**
 * A popover, not a tooltip: the variant links in it open their own
 * popover, and only a parent popover stays open while its child is open.
 */
export const PositionVariants = ({ className, position }: Props) => {
  return (
    <PopoverBaseUI
      title="Alternativen"
      trigger={
        <>
          <VariantWithLogo
            key={position.requiredVariants[0].id}
            variant={position.requiredVariants[0].variant}
            manufacturer={
              position.requiredVariants[0].variant.series.manufacturer
            }
            size={32}
            disableLink
          />

          <span className="flex size-6 items-center justify-center rounded-full border border-brand-red-500 bg-neutral-900 text-xs">
            +{position.requiredVariants.length - 1}
          </span>
        </>
      }
      triggerClassName={clsx(
        "flex cursor-default items-center gap-2 rounded-secondary hover:bg-neutral-700 focus-visible:bg-neutral-700",
        className,
      )}
    >
      <p className="text-sm text-gray-500">Alternativen</p>

      <div className="flex flex-col">
        {position.requiredVariants.map((requiredVariant) => (
          <VariantWithLogo
            key={requiredVariant.id}
            variant={requiredVariant.variant}
            manufacturer={requiredVariant.variant.series.manufacturer}
            size={32}
          />
        ))}
      </div>
    </PopoverBaseUI>
  );
};
