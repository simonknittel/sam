import type { Prisma } from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError } from "../errors.js";
import {
  ACTIVE_OWNER_SHIP_WHERE,
  VARIANT_EXTERNAL_LINK_SELECT,
  VARIANT_LINK_SELECT,
  VARIANT_MANUFACTURER_SELECT,
} from "./catalogRows.js";
import { VARIANT_TAG_ORDER, VARIANT_TAG_SELECT } from "./shipVariant.js";
import { canViewVariantPages } from "./variantPageAccess.js";

const VARIANT_DETAIL_SELECT = {
  id: true,
  name: true,
  status: true,
  seriesId: true,
  series: {
    select: {
      manufacturerId: true,
      ...VARIANT_MANUFACTURER_SELECT.series.select,
    },
  },
  tags: { select: VARIANT_TAG_SELECT, orderBy: VARIANT_TAG_ORDER },
  externalLinks: { select: VARIANT_EXTERNAL_LINK_SELECT },
  _count: { select: { ships: { where: ACTIVE_OWNER_SHIP_WHERE } } },
} as const satisfies Prisma.VariantSelect;

/**
 * The head of the variant page and the details of the variant popover. The
 * count has the ships of all active citizens that are not deleted, also of
 * the citizens that are not members. The ids of the series and of the
 * manufacturer give the link to the settings of the variant.
 */
export type VariantDetailRow = Prisma.VariantGetPayload<{
  select: typeof VARIANT_DETAIL_SELECT;
}>;

/**
 * The variant of the variant page and of its embedded wiki, or null when it
 * does not exist
 *
 * @throws ForbiddenError when the actor cannot see the variant pages
 */
export const findVariantDetail = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { variantId }: { readonly variantId: string },
): Promise<VariantDetailRow | null> => {
  if (!canViewVariantPages(actor))
    throw new ForbiddenError(
      "One of the permissions ship;manage or orgFleet;read is missing",
    );

  return context.prisma.variant.findUnique({
    where: { id: variantId },
    select: VARIANT_DETAIL_SELECT,
  });
};

/** A variant that embeds a wiki page */
export type VariantBacklinkRow = Prisma.VariantGetPayload<{
  select: typeof VARIANT_LINK_SELECT;
}>;

/**
 * The variants that embed the wiki page as their root page (not as an
 * ancestor), by name. Empty when the actor cannot see the variant pages,
 * like the embed that the actor cannot open.
 */
export const findVariantBacklinks = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { pageId }: { readonly pageId: string },
): Promise<VariantBacklinkRow[]> => {
  if (!canViewVariantPages(actor)) return [];

  return context.prisma.variant.findMany({
    where: { wikiPageId: pageId },
    select: VARIANT_LINK_SELECT,
    orderBy: { name: "asc" },
  });
};
