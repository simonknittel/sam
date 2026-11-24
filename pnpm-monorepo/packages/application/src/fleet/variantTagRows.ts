import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  VARIANT_TAG_ORDER,
  VARIANT_TAG_SELECT,
  type VariantTagOutput,
} from "./shipVariant.js";

export const findOrgFleetVariantTags = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<VariantTagOutput[]> => {
  requirePermission(actor, "orgFleet", "read");

  return context.prisma.variantTag.findMany({
    orderBy: VARIANT_TAG_ORDER,
    select: VARIANT_TAG_SELECT,
  });
};

const findOwnerFleetVariantTags = (
  context: Pick<ApplicationContext, "prisma">,
  ownerId: string,
): Promise<VariantTagOutput[]> =>
  context.prisma.variantTag.findMany({
    where: {
      variants: { some: { ships: { some: { ownerId, deletedAt: null } } } },
    },
    orderBy: VARIANT_TAG_ORDER,
    select: VARIANT_TAG_SELECT,
  });

export const findOwnFleetVariantTags = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<VariantTagOutput[]> => {
  requirePermission(actor, "ship", "read");

  if (!actor.citizen) return [];

  return findOwnerFleetVariantTags(context, actor.citizen.id);
};

export const findCitizenFleetVariantTags = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { citizenId }: { readonly citizenId: string },
): Promise<VariantTagOutput[]> => {
  requirePermission(actor, "otherShips", "read");

  return findOwnerFleetVariantTags(context, citizenId);
};
