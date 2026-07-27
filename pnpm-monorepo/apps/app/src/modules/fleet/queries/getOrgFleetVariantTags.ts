import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getOrgFleetVariantTags = cache(
  withTrace("getOrgFleetVariantTags", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("orgFleet", "read"))) forbidden();

    return prisma.variantTag.findMany({
      distinct: ["id"],
      orderBy: [{ key: "asc" }, { value: "asc" }],
    });
  }),
);
