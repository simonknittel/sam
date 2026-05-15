import { VariantStatus } from "@/generated/prisma/client";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { Link } from "@/modules/common/components/Link";
import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { VariantShipsTile } from "@/modules/fleet/components/VariantShipsTile";
import { VariantTagBadge } from "@/modules/fleet/components/VariantTagBadge";
import { VariantWithLogo } from "@/modules/fleet/components/VariantWithLogo";
import { getVariantDetail } from "@/modules/fleet/queries/variantDetail";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { FaExternalLinkAlt, FaRegCheckCircle } from "react-icons/fa";
import { FaRegCircleXmark } from "react-icons/fa6";

export async function generateMetadata({
  params,
}: PageProps<"/app/fleet/variant/[variantId]">): Promise<Metadata> {
  const variant = await getVariantDetail((await params).variantId);
  if (!variant) notFound();

  return {
    title: variant.name,
  };
}

export default async function Page({
  params,
}: PageProps<"/app/fleet/variant/[variantId]">) {
  const authentication = await requireAuthenticationPage(
    "/app/fleet/variant/[variantId]",
  );

  const hasShipManage = await authentication.authorize("ship", "manage");
  const hasOrgFleetRead = await authentication.authorize("orgFleet", "read");

  if (!hasShipManage && !hasOrgFleetRead) {
    await authentication.authorizePage("ship", "manage");
  }

  const variantId = (await params).variantId;
  const variant = await getVariantDetail(variantId);
  if (!variant) notFound();

  const hasOtherShipsRead = await authentication.authorize(
    "otherShips",
    "read",
  );

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex flex-col md:flex-row gap-0.5">
        <div className="bg-secondary rounded-primary p-4 flex gap-8 flex-1">
          <VariantWithLogo
            variant={variant}
            manufacturer={variant.series.manufacturer}
            size={80}
            variantNameClassName="text-2xl font-bold"
          />

          <div className="border-l border-white/10 pl-8 flex flex-col gap-2">
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
                  className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300 flex items-center gap-1 text-sm"
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

      <div className="flex flex-wrap gap-1 bg-secondary rounded-primary p-4">
        {variant.tags
          .toSorted((a, b) => a.key.localeCompare(b.key))
          .map((tag) => (
            <VariantTagBadge key={tag.id} tag={tag} />
          ))}
      </div>

      {hasOtherShipsRead && (
        <SuspenseWithErrorBoundaryTile className="mt-2">
          <VariantShipsTile variantId={variantId} className="mt-2" />
        </SuspenseWithErrorBoundaryTile>
      )}
    </div>
  );
}
