import { prisma } from "@/db";
import { VariantStatus } from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

const MY_FLEET_PAGE_SIZE = 100;

type CitizenFleetSort = "name-asc" | "name-desc";

export const getCitizenFleet = cache(
  withTrace(
    "getCitizenFleet",
    async (
      citizenId: string,
      {
        flightReady = "all",
        variantTagIds = [],
        manufacturerIds = [],
        sort = "name-asc",
        showDeleted = "all",
        searchQuery,
        cursor,
        direction = "next",
      }: {
        flightReady?: "all" | "flight_ready";
        variantTagIds?: string[];
        manufacturerIds?: string[];
        sort?: CitizenFleetSort;
        showDeleted?: "all" | "deleted";
        searchQuery?: string | null;
        cursor?: string | null;
        direction?: "next" | "prev";
      } = {},
    ) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("otherShips", "read"))) forbidden();

      // Resolve citizen's Discord ID -> Account -> User
      const citizen = await prisma.entity.findUnique({
        where: { id: citizenId },
        select: { discordId: true },
      });
      if (!citizen?.discordId) {
        return {
          ships: [],
          total: 0,
          nextCursor: null,
          prevCursor: null,
        };
      }

      const accounts = await prisma.account.findMany({
        where: { providerAccountId: citizen.discordId },
        select: { userId: true },
      });
      const userIds = accounts.map((a) => a.userId);
      if (userIds.length === 0) {
        return {
          ships: [],
          total: 0,
          nextCursor: null,
          prevCursor: null,
        };
      }

      const shipWhere: Record<string, unknown> = {
        ownerId: { in: userIds },
        ...(showDeleted === "all"
          ? { deletedAt: null }
          : { deletedAt: { not: null } }),
        variant: {
          ...(flightReady === "flight_ready"
            ? { status: VariantStatus.FLIGHT_READY }
            : {}),
          ...(variantTagIds.length > 0
            ? { tags: { some: { id: { in: variantTagIds } } } }
            : {}),
          ...(manufacturerIds.length > 0
            ? { series: { manufacturerId: { in: manufacturerIds } } }
            : {}),
          ...(searchQuery
            ? { name: { contains: searchQuery, mode: "insensitive" } }
            : {}),
        },
      };

      const allShips = await prisma.ship.findMany({
        where: shipWhere,
        include: {
          variant: {
            include: {
              series: {
                include: {
                  manufacturer: {
                    include: { image: true },
                  },
                },
              },
              tags: true,
            },
          },
        },
      });

      const [, sortDirection] = sort.split("-") as [string, "asc" | "desc"];
      const sortedShips = allShips.toSorted((a, b) =>
        sortDirection === "asc"
          ? sortAscWithAndNullLast(a.variant.name, b.variant.name)
          : sortDescAndNullLast(a.variant.name, b.variant.name),
      );

      let pageItems: typeof sortedShips;

      if (!cursor) {
        pageItems = sortedShips.slice(0, MY_FLEET_PAGE_SIZE + 1);
      } else if (direction === "next") {
        const cursorIndex = sortedShips.findIndex((s) => s.id === cursor);
        const fromIndex = cursorIndex !== -1 ? cursorIndex + 1 : 0;
        pageItems = sortedShips.slice(
          fromIndex,
          fromIndex + MY_FLEET_PAGE_SIZE + 1,
        );
      } else {
        const cursorIndex = sortedShips.findIndex((s) => s.id === cursor);
        const toIndex = cursorIndex !== -1 ? cursorIndex : sortedShips.length;
        const fromIndex = Math.max(0, toIndex - MY_FLEET_PAGE_SIZE - 1);
        pageItems = sortedShips.slice(fromIndex, toIndex);
      }

      const hasMore = pageItems.length > MY_FLEET_PAGE_SIZE;

      let ships: typeof sortedShips;
      if (hasMore) {
        ships =
          direction === "next"
            ? pageItems.slice(0, MY_FLEET_PAGE_SIZE)
            : pageItems.slice(1);
      } else {
        ships = pageItems;
      }

      const hasNextPage = direction === "next" ? hasMore : !!cursor;
      const hasPrevPage = direction === "prev" ? hasMore : !!cursor;

      return {
        ships,
        total: allShips.length,
        nextCursor:
          hasNextPage && ships.length > 0 ? ships[ships.length - 1].id : null,
        prevCursor: hasPrevPage && ships.length > 0 ? ships[0].id : null,
      };
    },
  ),
);
