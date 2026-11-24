import {
  SHIP_VARIANT_SELECT,
  VARIANT_TAG_SELECT,
} from "@sam-monorepo/application";
import type { Prisma } from "@sam-monorepo/database/client";

export { SHIP_VARIANT_SELECT, VARIANT_TAG_SELECT };

export const FLEET_PAGE_SIZE = 100;

export type VariantTagBadgeItem = Prisma.VariantTagGetPayload<{
  select: typeof VARIANT_TAG_SELECT;
}>;

export type ShipVariant = Prisma.VariantGetPayload<{
  select: typeof SHIP_VARIANT_SELECT;
}>;
