import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import { getActiveOrganizationMemberships } from "@/modules/organizations/queries/getActiveOrganizationMemberships";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { ORG_ID } from "@sam-monorepo/domain";
import { forbidden } from "next/navigation";
import { cache } from "react";
import {
  buildVariantFilterWhere,
  FLEET_PAGE_SIZE,
  paginateByCursor,
  SHIP_VARIANT_INCLUDE,
} from "./shipQuery";

type OrgFleetSort = "name-asc" | "name-desc" | "count-asc" | "count-desc";

export const getOrgFleet = cache(
  withTrace(
    "getOrgFleet",
    async ({
      flightReady = "all",
      variantTagIds = [],
      manufacturerIds = [],
      sort = "count-desc",
      searchQuery,
      cursor,
      direction = "next",
    }: {
      flightReady?: "all" | "flight_ready";
      variantTagIds?: string[];
      manufacturerIds?: string[];
      sort?: OrgFleetSort;
      searchQuery?: string | null;
      cursor?: string | null;
      direction?: "next" | "prev";
    }) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("orgFleet", "read"))) forbidden();

      const memberships = await getActiveOrganizationMemberships(ORG_ID);
      const citizenIds = memberships.map((membership) => membership.citizen.id);
      if (citizenIds.length === 0)
        return {
          fleet: [],
          totalCitizens: 0,
          totalShips: 0,
          nextCursor: null,
          prevCursor: null,
        };

      // Shared by the ship filter and the all-variants query below
      const variantWhere = buildVariantFilterWhere({
        flightReady,
        variantTagIds,
        manufacturerIds,
        searchQuery,
      });

      // The variant payload comes from the query below, thus the ships
      // themselves are only counted and attributed
      const allShips = await prisma.ship.findMany({
        where: {
          ownerId: { in: citizenIds },
          deletedAt: null,
          variant: variantWhere,
        },
        select: {
          ownerId: true,
          variantId: true,
        },
      });

      const shipsByVariantId = Map.groupBy(allShips, (ship) => ship.variantId);

      // ALL variants matching the same filters, so unowned ones show a zero
      const allVariants = await prisma.variant.findMany({
        where: variantWhere,
        include: SHIP_VARIANT_INCLUDE,
      });

      const countedFleet = allVariants.map((variant) => ({
        variant,
        count: shipsByVariantId.get(variant.id)?.length ?? 0,
      }));

      // Apply sorting
      const [sortField, sortDirection] = sort.split("-") as [
        "name" | "count",
        "asc" | "desc",
      ];

      const sortedFleet = countedFleet.toSorted((a, b) => {
        const sortFn =
          sortDirection === "asc"
            ? sortAscWithAndNullLast
            : sortDescAndNullLast;

        if (sortField === "name") {
          return sortFn(a.variant.name, b.variant.name);
        }

        return sortFn(a.count, b.count);
      });

      // Apply cursor-based pagination (cursor = variant id)
      const {
        items: fleet,
        nextCursor,
        prevCursor,
      } = paginateByCursor(sortedFleet, {
        cursor,
        direction,
        pageSize: FLEET_PAGE_SIZE,
        getCursor: (item) => item.variant.id,
      });

      const totalCitizens = new Set(allShips.map((ship) => ship.ownerId)).size;
      const totalShips = allShips.length;

      return {
        fleet,
        totalCitizens,
        totalShips,
        nextCursor,
        prevCursor,
      };
    },
  ),
);
