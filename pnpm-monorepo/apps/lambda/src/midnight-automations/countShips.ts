import { prisma, type Organization } from "@sam-monorepo/database";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

const ORG_ID = "cm4wm57sw0001opxo2c8oq0o0"; // TODO: Implement UI for configuring org ID

const getActiveOrganizationMemberships = async (id: Organization["id"]) => {
  return await captureAsyncFunc(
    "getActiveOrganizationMemberships",
    async () => {
      const memberships = await prisma.activeOrganizationMembership.findMany({
        where: {
          organizationId: id,
        },
        select: {
          citizen: {
            select: {
              discordId: true,
            },
          },
        },
      });

      return memberships;
    },
  );
};

const getVariantCounts = async (discordIds: string[]) => {
  return await captureAsyncFunc("getVariantCounts", async () => {
    const variantCounts = await prisma.ship.groupBy({
      where: {
        owner: {
          accounts: {
            some: {
              providerAccountId: {
                in: discordIds,
              },
            },
          },
        },
      },
      by: ["variantId"],
      _count: {
        id: true,
      },
    });

    return variantCounts;
  });
};

const getAllVariants = async () => {
  return await captureAsyncFunc("getAllVariants", async () => {
    const variants = await prisma.variant.findMany({
      select: {
        id: true,
      },
    });

    return variants;
  });
};

export const countShips = async () => {
  await captureAsyncFunc("countShips", async () => {
    const memberships = await getActiveOrganizationMemberships(ORG_ID);
    const discordIds = memberships
      .map((membership) => membership.citizen.discordId)
      .filter(Boolean) as string[];
    if (discordIds.length === 0) {
      log.info("No active organization memberships with discord IDs found");
      return;
    }

    const [allVariants, variantCounts] = await Promise.all([
      getAllVariants(),
      getVariantCounts(discordIds),
    ]);

    const variantCountMap = new Map(
      variantCounts.map((vc) => [vc.variantId, vc._count.id]),
    );

    const data = allVariants.map((variant) => ({
      variantId: variant.id,
      count: variantCountMap.get(variant.id) ?? 0,
    }));

    await captureAsyncFunc("save variant ship counts", () =>
      prisma.variantShipCount.createMany({
        data,
      }),
    );

    log.info("Saved ships per variant statistics", { count: data.length });
  });
};
