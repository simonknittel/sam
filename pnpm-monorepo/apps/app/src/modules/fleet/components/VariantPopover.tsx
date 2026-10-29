import { Link } from "@/modules/common/components/Link";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { Ship, Variant } from "@sam-monorepo/database/client";
import type { ReactNode } from "react";
import {
  ManufacturerLogo,
  type ManufacturerLogoManufacturer,
} from "./ManufacturerLogo";

interface Props {
  /** The trigger */
  readonly children: ReactNode;
  readonly triggerClassName?: string;
  readonly variant: Pick<Variant, "id" | "name">;
  readonly manufacturer: ManufacturerLogoManufacturer;
  /** See VariantWithLogo's `logo` */
  readonly logo?: { readonly src: string; readonly mimeType: string } | null;
  /**
   * The individual ship of a citizen. Without it, the popover shows only the
   * variant.
   */
  readonly ship?: Pick<Ship, "name">;
  /**
   * For a trigger that is a link itself: a click follows the link, only a
   * hover opens the popover.
   */
  readonly hoverOnly?: boolean;
}

/**
 * The places that show a variant have its data already, thus the popover
 * loads nothing.
 */
export const VariantPopover = ({
  children,
  triggerClassName,
  variant,
  manufacturer,
  logo,
  ship,
  hoverOnly = false,
}: Props) => {
  return (
    <PopoverBaseUI
      title="Schiffsdetails"
      trigger={children}
      triggerClassName={triggerClassName}
      childrenClassName="w-100"
      hoverOnly={hoverOnly}
    >
      <div className="flex items-center gap-4">
        <ManufacturerLogo manufacturer={manufacturer} logo={logo} size={48} />

        <div className="min-w-0">
          {manufacturer.name && (
            <p className="font-mono text-xs text-white/40 uppercase">
              {manufacturer.name}
            </p>
          )}

          <Link
            href={`/app/fleet/variant/${variant.id}`}
            className="font-mono text-lg font-bold text-interaction-500 uppercase hover:text-interaction-300 focus-visible:text-interaction-300 active:text-interaction-700"
            prefetch={false}
          >
            {variant.name}
          </Link>
        </div>
      </div>

      {ship?.name && (
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
