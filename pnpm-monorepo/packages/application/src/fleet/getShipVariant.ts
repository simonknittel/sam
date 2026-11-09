import type { Prisma } from "@sam-monorepo/database/client";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { ACTIVE_OWNER_SHIP_WHERE } from "./catalogRows.js";
import { FleetCatalogErrorMessage } from "./fleetCatalogErrors.js";
import {
  SHIP_VARIANT_SELECT,
  toShipVariantOutput,
  type ShipVariantOutput,
} from "./shipVariant.js";

export const getShipVariantInputSchema = z.object({
  variant_id: idSchema.describe("The variant from search_ship_variants."),
});

/** A variant in the shape of `getShipVariant()`, also for its writes */
export const SHIP_VARIANT_DETAIL_SELECT = {
  ...SHIP_VARIANT_SELECT,
  wikiPageId: true,
  externalLinks: {
    select: { serviceName: true, url: true },
    orderBy: { serviceName: "asc" },
  },
  _count: { select: { ships: { where: ACTIVE_OWNER_SHIP_WHERE } } },
} as const satisfies Prisma.VariantSelect;

export interface ShipVariantDetailOutput extends ShipVariantOutput {
  readonly links: {
    /** A member of `ExternalService` */
    readonly service: string;
    readonly url: string;
  }[];
  /** The page of the global wiki that the variant page embeds */
  readonly wiki_page_id: string | null;
  /** The ships of the active citizens that are not deleted */
  readonly ship_count: number;
}

export const toShipVariantDetailOutput = (
  variant: Prisma.VariantGetPayload<{
    select: typeof SHIP_VARIANT_DETAIL_SELECT;
  }>,
): ShipVariantDetailOutput => ({
  ...toShipVariantOutput(variant),
  links: variant.externalLinks.map((link) => ({
    service: link.serviceName,
    url: link.url,
  })),
  wiki_page_id: variant.wikiPageId,
  ship_count: variant._count.ships,
});

/**
 * A variant of the catalog with the fields that its update can change. The
 * permission keeps the linked wiki page from the other users, like
 * `findManagedVariant()`.
 *
 * @throws NotFoundError when the variant does not exist
 */
export const getShipVariant = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  input: z.infer<typeof getShipVariantInputSchema>,
): Promise<ShipVariantDetailOutput> => {
  requirePermission(actor, "manufacturersSeriesAndVariants", "manage");

  const variant = await context.prisma.variant.findUnique({
    where: { id: input.variant_id },
    select: SHIP_VARIANT_DETAIL_SELECT,
  });
  if (!variant)
    throw new NotFoundError(FleetCatalogErrorMessage.VariantNotFound);

  return toShipVariantDetailOutput(variant);
};
