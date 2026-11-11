import type { Prisma } from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError } from "../errors.js";
import { buildVariantWikiContext } from "../wiki/variantWikiContext.js";
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

export interface VariantPopoverDetail extends VariantDetailRow {
  /** Whether the variant page embeds a wiki page that the actor can read */
  readonly hasWikiPage: boolean;
}

/**
 * The details of the variant popover, or null when the variant does not
 * exist. Like the variant page, the popover never tells about a linked page
 * that the actor cannot read.
 *
 * @throws ForbiddenError when the actor cannot see the variant pages
 */
export const findVariantPopoverDetail = async (
  context: ApplicationContext,
  actor: Actor,
  { variantId }: { readonly variantId: string },
): Promise<VariantPopoverDetail | null> => {
  const [variant, wikiContext] = await Promise.all([
    findVariantDetail(context, actor, { variantId }),
    buildVariantWikiContext(context, actor, variantId),
  ]);
  if (!variant) return null;

  return { ...variant, hasWikiPage: wikiContext !== null };
};

/**
 * Whether the actor can link a wiki page to the variant now: the actor
 * manages the ship catalog and the variant has no linked page. A link to a
 * page that the actor cannot read or that is in the trash also gives false,
 * thus the variant page never asks the actor to replace a link that the
 * actor cannot see.
 */
export const canLinkVariantWikiPage = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { variantId }: { readonly variantId: string },
): Promise<boolean> => {
  if (
    !actor.authorize("manufacturersSeriesAndVariants", "manage") ||
    actor.citizen === null
  )
    return false;

  const variant = await context.prisma.variant.findUnique({
    where: { id: variantId },
    select: { wikiPageId: true },
  });
  return variant?.wikiPageId === null;
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
