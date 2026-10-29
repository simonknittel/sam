import { Link } from "@/modules/common/components/Link";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { Ship, Variant } from "@sam-monorepo/database/client";
import type { ReactNode } from "react";
import {
  ManufacturerLogo,
  type ManufacturerLogoManufacturer,
} from "./ManufacturerLogo";

export interface ShipPopoverShip extends Pick<Ship, "name"> {
  readonly variant: Pick<Variant, "id" | "name"> & {
    readonly series: { readonly manufacturer: ManufacturerLogoManufacturer };
  };
}

interface Props {
  /** The trigger */
  readonly children: ReactNode;
  readonly triggerClassName?: string;
  readonly ship: ShipPopoverShip;
  /**
   * For a trigger that is a link itself: a click follows the link, only a
   * hover opens the popover.
   */
  readonly hoverOnly?: boolean;
}

/**
 * The places that show a ship have its variant already, thus the popover
 * loads nothing.
 */
export const ShipPopover = ({
  children,
  triggerClassName,
  ship,
  hoverOnly = false,
}: Props) => {
  const { variant } = ship;
  const { manufacturer } = variant.series;

  return (
    <PopoverBaseUI
      title="Schiffsdetails"
      trigger={children}
      triggerClassName={triggerClassName}
      childrenClassName="w-100"
      hoverOnly={hoverOnly}
    >
      <div className="flex items-center gap-4">
        <ManufacturerLogo manufacturer={manufacturer} size={48} />

        <div className="min-w-0">
          <p className="font-mono text-xs text-white/40 uppercase">
            {manufacturer.name}
          </p>

          <Link
            href={`/app/fleet/variant/${variant.id}`}
            className="font-mono text-lg font-bold text-interaction-500 uppercase hover:text-interaction-300 focus-visible:text-interaction-300 active:text-interaction-700"
            prefetch={false}
          >
            {variant.name}
          </Link>
        </div>
      </div>

      {ship.name && (
        <dl className="mt-4 flex items-baseline gap-4 border-t border-white/10 pt-4">
          <dt className="text-white/40">Name</dt>

          <dd className="min-w-0 truncate" title={ship.name}>
            {ship.name}
          </dd>
        </dl>
      )}
    </PopoverBaseUI>
  );
};
