import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getSilcBalanceOfCurrentCitizen = cache(
  withTrace("getSilcBalanceOfCurrentCitizen", async () => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) forbidden();
    if (
      !(await authentication.authorize("silcBalanceOfCurrentCitizen", "read"))
    )
      forbidden();

    const entity = await prisma.entity.findUniqueOrThrow({
      where: {
        id: authentication.session.entity.id,
      },
      select: {
        silcBalance: true,
      },
    });

    return entity.silcBalance;
  }),
);
