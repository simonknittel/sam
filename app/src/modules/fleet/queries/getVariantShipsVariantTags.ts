import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getVariantShipsVariantTags = cache(
  withTrace("getVariantShipsVariantTags", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("otherShips", "read"))) forbidden();

    return prisma.variantTag.findMany({
      distinct: ["id"],
      orderBy: [{ key: "asc" }, { value: "asc" }],
    });
  }),
);
