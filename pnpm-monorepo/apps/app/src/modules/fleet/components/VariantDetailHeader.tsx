import { Link } from "@/modules/common/components/Link";
import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { VariantStatus } from "@sam-monorepo/database/client";
import { FaCog, FaRegCheckCircle } from "react-icons/fa";
import { FaRegCircleXmark } from "react-icons/fa6";
import type { getVariantDetail } from "../queries/variantDetail";
import { VariantExternalLink } from "./VariantExternalLink";
import { VariantTagBadge } from "./VariantTagBadge";
import { VariantWithLogo } from "./VariantWithLogo";

export type VariantDetail = NonNullable<
  Awaited<ReturnType<typeof getVariantDetail>>
>;

interface Props {
  readonly variant: VariantDetail;
  /** For the managers of the ship catalog: the link to the settings */
  readonly showSettingsLink: boolean;
}

/**
 * The metadata head of the variant detail page: logo, flight-ready status,
 * external links, ship count and tags. Shared by the plain variant page and
 * its embedded wiki routes.
 */
export const VariantDetailHeader = ({ variant, showSettingsLink }: Props) => {
  return (
    <>
      <div className="flex flex-col gap-0.5 md:flex-row">
        <div className="flex flex-1 flex-col gap-4 rounded-primary bg-secondary p-4 sm:flex-row sm:gap-8">
          <div className="flex items-center gap-2">
            <VariantWithLogo
              variant={variant}
              manufacturer={variant.series.manufacturer}
              size={80}
              variantNameClassName="text-2xl font-bold"
              disableLink
            />

            {showSettingsLink && (
              <Link
                href={`/app/fleet/settings/manufacturer/${variant.series.manufacturerId}/series/${variant.seriesId}`}
                title="Einstellungen"
                className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300 active:text-interaction-700"
              >
                <FaCog />
              </Link>
            )}
          </div>

          {/* A container: the links take two columns only where they fit */}
          <div className="@container/links flex min-w-0 flex-1 flex-col gap-2 border-t border-white/10 pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
            <div className="flex items-center gap-1">
              {variant.status === VariantStatus.FLIGHT_READY && (
                <>
                  <FaRegCheckCircle /> Flight ready
                </>
              )}
              {variant.status === VariantStatus.NOT_FLIGHT_READY && (
                <>
                  <FaRegCircleXmark className="text-brand-red-500" /> Nicht
                  flight ready
                </>
              )}
            </div>

            {variant.externalLinks.length > 0 && (
              <ul
                aria-label="Links"
                className="grid gap-x-6 @xs/links:grid-cols-[repeat(2,max-content)]"
              >
                {variant.externalLinks.map((link) => (
                  <li key={link.id}>
                    <VariantExternalLink link={link} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <StatisticTile label="Einzelschiffe" className="flex-1">
          <ScrambleIn
            text={variant._count.ships.toLocaleString("de-de")}
            characters="1234567890."
          />
        </StatisticTile>
      </div>

      {variant.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 rounded-primary bg-secondary p-4">
          {variant.tags.map((tag) => (
            <VariantTagBadge key={tag.id} tag={tag} />
          ))}
        </div>
      )}
    </>
  );
};
