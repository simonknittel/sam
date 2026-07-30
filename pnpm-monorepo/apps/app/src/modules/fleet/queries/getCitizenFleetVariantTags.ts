import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getCitizenFleetVariantTags = cache(
  withTrace("getCitizenFleetVariantTags", async (citizenId: string) => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("otherShips", "read"))) forbidden();

    // Resolve citizen's Discord ID -> Account -> User
    const citizen = await prisma.entity.findUnique({
      where: { id: citizenId },
      select: { discordId: true },
    });
    if (!citizen?.discordId) return [];

    const accounts = await prisma.account.findMany({
      where: { providerAccountId: citizen.discordId },
      select: { userId: true },
    });
    const userIds = accounts.map((a) => a.userId);
    if (userIds.length === 0) return [];

    const ships = await prisma.ship.findMany({
      where: { ownerId: { in: userIds }, deletedAt: null },
      select: { variantId: true },
    });

    const variantIds = [...new Set(ships.map((s) => s.variantId))];
    if (variantIds.length === 0) return [];

    const tags = await prisma.variantTag.findMany({
      where: {
        variants: {
          some: {
            id: { in: variantIds },
          },
        },
      },
      distinct: ["id"],
      orderBy: [{ key: "asc" }, { value: "asc" }],
    });

    return tags;
  }),
);
