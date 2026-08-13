import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import {
  buildVariantFilterWhere,
  FLEET_PAGE_SIZE,
  paginateByCursor,
  SHIP_INCLUDE,
} from "./shipQuery";

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
        variant: buildVariantFilterWhere({
          flightReady,
          variantTagIds,
          manufacturerIds,
          searchQuery,
        }),
      };

      const allShips = await prisma.ship.findMany({
        where: shipWhere,
        include: SHIP_INCLUDE,
      });

      const [, sortDirection] = sort.split("-") as [string, "asc" | "desc"];
      const sortedShips = allShips.toSorted((a, b) =>
        sortDirection === "asc"
          ? sortAscWithAndNullLast(a.variant.name, b.variant.name)
          : sortDescAndNullLast(a.variant.name, b.variant.name),
      );

      const {
        items: ships,
        nextCursor,
        prevCursor,
      } = paginateByCursor(sortedShips, {
        cursor,
        direction,
        pageSize: FLEET_PAGE_SIZE,
        getCursor: (ship) => ship.id,
      });

      return {
        ships,
        total: allShips.length,
        nextCursor,
        prevCursor,
      };
    },
  ),
);
