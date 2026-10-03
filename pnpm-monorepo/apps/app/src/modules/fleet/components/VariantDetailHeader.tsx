import { Link } from "@/modules/common/components/Link";
import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { VariantStatus } from "@sam-monorepo/database/client";
import { FaExternalLinkAlt, FaRegCheckCircle } from "react-icons/fa";
import { FaRegCircleXmark } from "react-icons/fa6";
import type { getVariantDetail } from "../queries/variantDetail";
import { VariantTagBadge } from "./VariantTagBadge";
import { VariantWithLogo } from "./VariantWithLogo";

export type VariantDetail = NonNullable<
  Awaited<ReturnType<typeof getVariantDetail>>
>;

interface Props {
  readonly variant: VariantDetail;
}

/**
 * The metadata head of the variant detail page: logo, flight-ready status,
 * external links, ship count and tags. Shared by the plain variant page and
 * its embedded wiki routes.
 */
export const VariantDetailHeader = ({ variant }: Props) => {
  return (
    <>
      <div className="flex flex-col gap-0.5 md:flex-row">
        <div className="flex flex-1 gap-8 rounded-primary bg-secondary p-4">
          <VariantWithLogo
            variant={variant}
            manufacturer={variant.series.manufacturer}
            size={80}
            variantNameClassName="text-2xl font-bold"
            disableLink
          />

          <div className="flex flex-col gap-2 border-l border-white/10 pl-8">
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

            <div>
              {variant.externalLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
                  title={link.url}
                >
                  {link.serviceName}
                  <FaExternalLinkAlt className="size-3" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <StatisticTile label="Einzelschiffe" className="flex-1">
          <ScrambleIn
            text={variant._count.ships.toLocaleString("de-de")}
            characters="1234567890."
          />
        </StatisticTile>
      </div>

      <div className="flex flex-wrap gap-1 rounded-primary bg-secondary p-4">
        {variant.tags
          .toSorted((a, b) => a.key.localeCompare(b.key))
          .map((tag) => (
            <VariantTagBadge key={tag.id} tag={tag} />
          ))}
      </div>
    </>
  );
};
