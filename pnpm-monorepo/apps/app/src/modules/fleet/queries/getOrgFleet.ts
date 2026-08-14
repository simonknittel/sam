import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import { getActiveOrganizationMemberships } from "@/modules/organizations/queries/getActiveOrganizationMemberships";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  type Manufacturer,
  type Upload,
  type VariantStatus,
  type VariantTag,
} from "@sam-monorepo/database/client";
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

interface OrgFleetShip {
  id: string;
  ownerId: string;
  variantId: string;
  variant: {
    id: string;
    name: string;
    seriesId: string;
    status: VariantStatus | null;
    series: {
      id: string;
      name: string;
      manufacturerId: string;
      manufacturer: Manufacturer & {
        image: Upload | null;
      };
    };
    tags: VariantTag[];
  };
}

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

      // Get discord IDs of all citizens with an active membership in the org
      const memberships = await getActiveOrganizationMemberships(ORG_ID);
      const discordIds = memberships
        .map((membership) => membership.citizen.discordId)
        .filter(Boolean) as string[];
      if (discordIds.length === 0)
        return {
          fleet: [],
          totalUsers: 0,
          totalShips: 0,
          nextCursor: null,
          prevCursor: null,
        };

      // Build where clause for variants (shared between ship subquery and all-variants query)
      const variantWhere = buildVariantFilterWhere({
        flightReady,
        variantTagIds,
        manufacturerIds,
        searchQuery,
      });

      // Get ships for all those citizens
      const accounts = await prisma.account.findMany({
        where: {
          providerAccountId: {
            in: discordIds,
          },
        },
        select: {
          user: {
            select: {
              id: true,
              ships: {
                where: {
                  deletedAt: null,
                  variant: variantWhere,
                },
                include: {
                  variant: {
                    include: SHIP_VARIANT_INCLUDE,
                  },
                },
              },
            },
          },
        },
      });

      const allShips = accounts.flatMap(
        (account) => account.user.ships,
      ) as OrgFleetShip[];

      // Group owned ships by variant ID
      const groupedShips = Map.groupBy(allShips, (ship) => ship.variant.id);
      const ownedVariants = new Map<string, OrgFleetShip & { count: number }>(
        Array.from(groupedShips, ([variantId, ships]) => [
          variantId,
          { ...ships[0], count: ships.length },
        ]),
      );

      // Fetch ALL variants matching the same filters
      const allVariants = await prisma.variant.findMany({
        where: variantWhere,
        include: SHIP_VARIANT_INCLUDE,
      });

      // Merge: owned variants with count + unowned variants with count 0
      const countedFleet = allVariants.map((variant) => {
        const owned = ownedVariants.get(variant.id);
        if (owned) return owned;

        return {
          id: "",
          ownerId: "",
          variantId: variant.id,
          variant: {
            ...variant,
            series: {
              ...variant.series,
              manufacturer: {
                ...variant.series.manufacturer,
                image: variant.series.manufacturer.image ?? null,
              },
            },
          },
          count: 0,
        };
      });

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

      const totalUsers = new Set(allShips.map((ship) => ship.ownerId)).size;
      const totalShips = allShips.length;

      return {
        fleet,
        totalUsers,
        totalShips,
        nextCursor,
        prevCursor,
      };
    },
  ),
);
