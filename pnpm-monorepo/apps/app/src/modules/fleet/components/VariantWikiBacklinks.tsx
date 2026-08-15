import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { VariantWithLogo } from "./VariantWithLogo";

interface Props {
  readonly pageId: string;
}

/**
 * Chips on a wiki page that is embedded on variant detail pages, linking
 * back to those variants. Only rendered on the linked root page itself
 * (the query matches the exact page id, never descendants) and only for
 * viewers passing the variant pages' fleet gate — everyone else sees
 * nothing, like the section they could not open.
 */
export const VariantWikiBacklinks = async ({ pageId }: Props) => {
  const authentication = await authenticate();
  if (!authentication) return null;

  const [hasShipManage, hasOrgFleetRead] = await Promise.all([
    authentication.authorize("ship", "manage"),
    authentication.authorize("orgFleet", "read"),
  ]);
  if (!hasShipManage && !hasOrgFleetRead) return null;

  const variants = await prisma.variant.findMany({
    where: { wikiPageId: pageId },
    select: {
      id: true,
      name: true,
      series: {
        select: {
          manufacturer: {
            select: { name: true, image: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });
  if (variants.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/40">
      <span className="uppercase font-mono">Eingebunden bei:</span>
      {variants.map((variant) => (
        <VariantWithLogo
          key={variant.id}
          variant={variant}
          manufacturer={variant.series.manufacturer}
          size={32}
          variantNameClassName="text-sm text-neutral-300"
        />
      ))}
    </div>
  );
};
