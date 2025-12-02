import { prisma } from "@sam-monorepo/database";
import { log } from "../../common/logger";
import { captureAsyncFunc } from "../../common/xray";

export const countShips = async () => {
  await captureAsyncFunc("countShips", async () => {
    const [allVariants, variantCounts] = await captureAsyncFunc(
      "fetch variants and counts",
      () =>
        prisma.$transaction(async (tx) => {
          const variants = await tx.variant.findMany({
            select: {
              id: true,
            },
          });
          const counts = await tx.ship.groupBy({
            by: ["variantId"],
            _count: {
              id: true,
            },
          });
          return [variants, counts] as const;
        }),
    );

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
