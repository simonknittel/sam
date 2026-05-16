import { prisma } from "@/db";
import {
  VariantStatus,
  type Manufacturer,
  type Upload,
  type VariantTag,
} from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import { getActiveOrganizationMemberships } from "@/modules/organizations/queries/getActiveOrganizationMemberships";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { groupBy } from "lodash";
import { forbidden } from "next/navigation";
import { cache } from "react";

const ORG_ID = "cm4wm57sw0001opxo2c8oq0o0"; // TODO: Implement UI for configuring org ID

const ORG_FLEET_PAGE_SIZE = 100;

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
      const variantWhere: Record<string, unknown> = {
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
      };

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
                    include: {
                      series: {
                        include: {
                          manufacturer: {
                            include: {
                              image: true,
                            },
                          },
                        },
                      },
                      tags: true,
                    },
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
      const groupedShips = groupBy(allShips, (ship) => ship.variant.id);
      const ownedVariants = new Map<string, OrgFleetShip & { count: number }>(
        Object.entries(groupedShips).map(([variantId, ships]) => [
          variantId,
          { ...ships[0], count: ships.length },
        ]),
      );

      // Fetch ALL variants matching the same filters
      const allVariants = await prisma.variant.findMany({
        where: variantWhere,
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
      const allItems = sortedFleet;

      let pageItems: (OrgFleetShip & { count: number })[];

      if (!cursor) {
        // First page - fetch from start
        pageItems = allItems.slice(0, ORG_FLEET_PAGE_SIZE + 1);
      } else if (direction === "next") {
        // After cursor
        const cursorIndex = allItems.findIndex(
          (item) => item.variant.id === cursor,
        );
        const fromIndex = cursorIndex !== -1 ? cursorIndex + 1 : 0;
        pageItems = allItems.slice(
          fromIndex,
          fromIndex + ORG_FLEET_PAGE_SIZE + 1,
        );
      } else {
        // Before cursor
        const cursorIndex = allItems.findIndex(
          (item) => item.variant.id === cursor,
        );
        const toIndex = cursorIndex !== -1 ? cursorIndex : allItems.length;
        const fromIndex = Math.max(0, toIndex - ORG_FLEET_PAGE_SIZE - 1);
        pageItems = allItems.slice(fromIndex, toIndex);
      }

      const hasMore = pageItems.length > ORG_FLEET_PAGE_SIZE;

      let fleet: (OrgFleetShip & { count: number })[];
      if (hasMore) {
        fleet =
          direction === "next"
            ? pageItems.slice(0, ORG_FLEET_PAGE_SIZE)
            : pageItems.slice(1);
      } else {
        fleet = pageItems;
      }

      const hasNextPage = direction === "next" ? hasMore : !!cursor;
      const hasPrevPage = direction === "prev" ? hasMore : !!cursor;

      const totalUsers = new Set(allShips.map((ship) => ship.ownerId)).size;
      const totalShips = allShips.length;

      return {
        fleet,
        totalUsers,
        totalShips,
        nextCursor:
          hasNextPage && fleet.length > 0
            ? fleet[fleet.length - 1].variant.id
            : null,
        prevCursor:
          hasPrevPage && fleet.length > 0 ? fleet[0].variant.id : null,
      };
    },
  ),
);
