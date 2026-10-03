import { Tooltip } from "@/modules/common/components/Tooltip";
import { VariantWithLogo } from "@/modules/fleet/components/VariantWithLogo";
import clsx from "clsx";
import type { PositionType } from "./Position";

interface Props {
  readonly className?: string;
  readonly position: PositionType;
}

export const PositionVariants = ({ className, position }: Props) => {
  return (
    <Tooltip
      asChild
      triggerChildren={
        <button
          type="button"
          className={clsx(
            "flex cursor-default items-center gap-2 rounded-secondary hover:bg-neutral-700",
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
            disableLink
          />

          <span className="flex size-6 items-center justify-center rounded-full border border-brand-red-500 bg-neutral-900 text-xs">
            +{position.requiredVariants.length - 1}
          </span>
        </button>
      }
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
    </Tooltip>
  );
};
