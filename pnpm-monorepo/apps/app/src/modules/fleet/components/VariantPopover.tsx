"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { ProfileAttribute } from "@/modules/citizen/components/ProfileAttribute";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Link } from "@/modules/common/components/Link";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { api } from "@/trpc/react";
import {
  VariantStatus,
  type Ship,
  type Variant,
} from "@sam-monorepo/database/browser";
import { useState, type ReactNode } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaCog, FaRegCheckCircle } from "react-icons/fa";
import { FaRegCircleXmark } from "react-icons/fa6";
import {
  ManufacturerLogo,
  type ManufacturerLogoManufacturer,
} from "./ManufacturerLogo";
import { VariantTagBadge } from "./VariantTagBadge";

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
 * The places that show a variant have its name and its manufacturer, thus
 * the head of the popover shows immediately. The other details of the
 * variant load only when the popover opens.
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
  const [isOpen, setIsOpen] = useState(false);
  const authentication = useAuthentication();
  /** Same rule as `canViewVariantPages()` of the server */
  const canViewDetails = Boolean(
    authentication &&
    (authentication.authorize("ship", "manage") ||
      authentication.authorize("orgFleet", "read")),
  );
  const canManage =
    authentication &&
    authentication.authorize("manufacturersSeriesAndVariants", "manage");

  const query = api.variant.getDetailById.useQuery(
    { id: variant.id },
    { enabled: isOpen && canViewDetails },
  );
  const details = query.data;

  return (
    <PopoverBaseUI
      title="Schiffsdetails"
      trigger={children}
      triggerClassName={triggerClassName}
      childrenClassName="w-100"
      onOpenChange={setIsOpen}
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

          <div className="flex items-center gap-2">
            <Link
              href={`/app/fleet/variant/${variant.id}`}
              className="font-mono text-lg font-bold text-interaction-500 uppercase hover:text-interaction-300 focus-visible:text-interaction-300 active:text-interaction-700"
              prefetch={false}
            >
              {variant.name}
            </Link>

            {canManage && details && (
              <Link
                href={`/app/fleet/settings/manufacturer/${details.series.manufacturerId}/series/${details.seriesId}`}
                title="Einstellungen"
                className="text-sm text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300 active:text-interaction-700"
              >
                <FaCog />
              </Link>
            )}
          </div>
        </div>
      </div>

      {details && details.tags.length > 0 && (
        <ul aria-label="Tags" className="mt-4 flex flex-wrap gap-1">
          {details.tags.map((tag) => (
            <li key={tag.id} className="max-w-full">
              <VariantTagBadge tag={tag} />
            </li>
          ))}
        </ul>
      )}

      {(ship?.name || details) && (
        <dl className="mt-4 flex flex-col gap-1 border-t border-white/10 pt-4 text-sm">
          {ship?.name && (
            <ProfileAttribute name="Name">
              <span className="truncate" title={ship.name}>
                {ship.name}
              </span>
            </ProfileAttribute>
          )}

          {details?.status && <FlightReadyAttribute status={details.status} />}

          {details && (
            <ProfileAttribute name="Einzelschiffe">
              {details._count.ships.toLocaleString("de-de")}
            </ProfileAttribute>
          )}
        </dl>
      )}

      {query.isLoading && (
        <p className="mt-4 flex animate-pulse items-center justify-center gap-2 font-mono text-sm uppercase">
          <AsciiSpinner />
          Details werden geladen...
        </p>
      )}

      {query.error && (
        <p className="mt-4 flex items-center justify-center gap-2 font-mono text-sm text-red-500 uppercase">
          <BsExclamationOctagonFill className="text-red-800" />
          Fehler beim Laden der Details
        </p>
      )}
    </PopoverBaseUI>
  );
};

interface FlightReadyAttributeProps {
  readonly status: VariantStatus;
}

const FlightReadyAttribute = ({ status }: FlightReadyAttributeProps) => {
  switch (status) {
    case VariantStatus.FLIGHT_READY:
      return (
        <ProfileAttribute name="Flight ready">
          <span className="flex items-center gap-1">
            <FaRegCheckCircle />
            Ja
          </span>
        </ProfileAttribute>
      );

    case VariantStatus.NOT_FLIGHT_READY:
      return (
        <ProfileAttribute name="Flight ready">
          <span className="flex items-center gap-1">
            <FaRegCircleXmark className="text-brand-red-500" />
            Nein
          </span>
        </ProfileAttribute>
      );

    default:
      throw new Error(`Unknown variant status: ${status satisfies never}`);
  }
};
