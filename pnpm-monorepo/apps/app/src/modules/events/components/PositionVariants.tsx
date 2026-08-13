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
            disableLink
          />

          <span className="rounded-full bg-neutral-900 size-6 flex items-center justify-center text-xs border border-brand-red-500">
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
