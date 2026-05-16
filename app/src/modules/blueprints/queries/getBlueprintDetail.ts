import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

export interface BlueprintDetail {
  id: string;
  originalKey: string;
  itemName: string;
  itemDescription: string | null;
  isUnlocked: boolean;
  unlockCount: number;
  unlocks: {
    citizenId: string;
    citizenHandle: string | null;
    createdAt: Date;
  }[];
}

export const getBlueprintDetail = cache(
  withTrace(
    "getBlueprintDetail",
    async (blueprintId: string): Promise<BlueprintDetail | null> => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("blueprint", "read"))) forbidden();

      const citizenId = authentication.session.entity?.id;

      const blueprint = await prisma.blueprint.findUnique({
        where: {
          id: blueprintId,
        },
        include: {
          item: {
            select: {
              name: true,
              description: true,
            },
          },
          unlocks: {
            include: {
              citizen: {
                select: {
                  id: true,
                  logs: {
                    where: {
                      type: "handle",
                      attributes: {
                        some: {
                          key: "confirmed",
                          value: "confirmed",
                        },
                      },
                    },
                    orderBy: {
                      createdAt: "desc",
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      if (!blueprint?.item.name) return null;

      return {
        id: blueprint.id,
        originalKey: blueprint.originalKey,
        itemName: blueprint.item.name,
        itemDescription: blueprint.item.description,
        isUnlocked: citizenId
          ? blueprint.unlocks.some((u) => u.citizenId === citizenId)
          : false,
        unlockCount: blueprint.unlocks.length,
        unlocks: blueprint.unlocks.map((unlock) => ({
          citizenId: unlock.citizen.id,
          citizenHandle: unlock.citizen.logs[0]?.content ?? null,
          createdAt: unlock.createdAt,
        })),
      };
    },
  ),
);
