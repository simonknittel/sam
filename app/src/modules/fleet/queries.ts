import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  VariantStatus,
  type Manufacturer,
  type Series,
  type Upload,
  type VariantTag,
} from "@prisma/client";
import { groupBy } from "lodash";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getActiveOrganizationMemberships } from "../organizations/queries";

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
      sort = "name-asc",
      cursor,
      direction = "next",
    }: {
      flightReady?: "all" | "flight_ready";
      variantTagIds?: string[];
      sort?: OrgFleetSort;
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
        return { fleet: [], totalUsers: 0, nextCursor: null, prevCursor: null };

      // Build where clause for ships
      const shipWhere: Record<string, unknown> = {
        variant: {
          ...(flightReady === "flight_ready"
            ? { status: VariantStatus.FLIGHT_READY }
            : {}),
          ...(variantTagIds.length > 0
            ? { tags: { some: { id: { in: variantTagIds } } } }
            : {}),
        },
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
                where: shipWhere,
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

      // Group by variant
      const groupedFleet = groupBy(allShips, (ship) => ship.variant.id);
      const countedFleet = Object.values(groupedFleet).map((ships) => {
        const ship = ships[0];

        return {
          ...ship,
          count: ships.length,
        };
      }) as (OrgFleetShip & { count: number })[];

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

      return {
        fleet,
        totalUsers,
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

export const getOrgFleetVariantTags = cache(
  withTrace("getOrgFleetVariantTags", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("orgFleet", "read"))) forbidden();

    const memberships = await getActiveOrganizationMemberships(ORG_ID);
    const discordIds = memberships
      .map((membership) => membership.citizen.discordId)
      .filter(Boolean) as string[];
    if (discordIds.length === 0) return [];

    const accounts = await prisma.account.findMany({
      where: {
        providerAccountId: {
          in: discordIds,
        },
      },
      select: {
        user: {
          select: {
            ships: {
              select: {
                variantId: true,
              },
            },
          },
        },
      },
    });

    const variantIds = [
      ...new Set(
        accounts.flatMap((account) =>
          account.user.ships.map((s) => s.variantId),
        ),
      ),
    ];

    if (variantIds.length === 0) return [];

    const tags = await prisma.variantTag.findMany({
      where: {
        variants: {
          some: {
            id: {
              in: variantIds,
            },
          },
        },
      },
      distinct: ["id"],
      orderBy: [{ key: "asc" }, { value: "asc" }],
    });

    return tags;
  }),
);

const MY_FLEET_PAGE_SIZE = 100;

type MyFleetSort = "name-asc" | "name-desc";

export const getMyFleet = cache(
  withTrace(
    "getMyFleet",
    async ({
      flightReady = "all",
      variantTagIds = [],
      sort = "name-asc",
      cursor,
      direction = "next",
    }: {
      flightReady?: "all" | "flight_ready";
      variantTagIds?: string[];
      sort?: MyFleetSort;
      cursor?: string | null;
      direction?: "next" | "prev";
    } = {}) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("ship", "read"))) forbidden();

      const shipWhere: Record<string, unknown> = {
        ownerId: authentication.session.user.id,
        variant: {
          ...(flightReady === "flight_ready"
            ? { status: VariantStatus.FLIGHT_READY }
            : {}),
          ...(variantTagIds.length > 0
            ? { tags: { some: { id: { in: variantTagIds } } } }
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

export const getMyFleetVariantTags = cache(
  withTrace("getMyFleetVariantTags", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("ship", "read"))) forbidden();

    const ships = await prisma.ship.findMany({
      where: {
        ownerId: authentication.session.user.id,
      },
      select: {
        variantId: true,
      },
    });

    const variantIds = [...new Set(ships.map((s) => s.variantId))];

    if (variantIds.length === 0) return [];

    const tags = await prisma.variantTag.findMany({
      where: {
        variants: {
          some: {
            id: {
              in: variantIds,
            },
          },
        },
      },
      distinct: ["id"],
      orderBy: [{ key: "asc" }, { value: "asc" }],
    });

    return tags;
  }),
);

export const getVariantsBySeriesId = withTrace(
  "getVariantsBySeriesId",
  async (seriesId: Series["id"]) => {
    return prisma.variant.findMany({
      where: {
        seriesId,
      },
      include: {
        _count: {
          select: {
            ships: true,
          },
        },
        tags: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  },
);

export const getSeriesByManufacturerId = withTrace(
  "getSeriesByManufacturerId",
  async (manufacturerId: Manufacturer["id"]) => {
    return prisma.series.findMany({
      select: {
        id: true,
        name: true,
        variants: {
          select: {
            name: true,
          },
          orderBy: {
            name: "asc",
          },
        },
      },
      where: {
        manufacturerId,
      },
      orderBy: {
        name: "asc",
      },
    });
  },
);

export const getSeriesAndManufacturerById = cache(
  withTrace(
    "getSeriesAndManufacturerById",
    async (seriesId: Series["id"], manufacturerId: Manufacturer["id"]) => {
      return Promise.all([
        prisma.series.findUnique({
          where: {
            id: seriesId,
          },
        }),

        prisma.manufacturer.findUnique({
          where: {
            id: manufacturerId,
          },
        }),
      ]);
    },
  ),
);

export const getManufacturers = withTrace("getManufacturers", async () => {
  return prisma.manufacturer.findMany({
    select: {
      id: true,
      imageId: true,
      image: true,
      name: true,
      series: {
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
});

export const getManufacturerById = withTrace(
  "getManufacturerById",
  async (manufacturerId: Manufacturer["id"]) => {
    return prisma.manufacturer.findUnique({
      where: {
        id: manufacturerId,
      },
      include: {
        image: true,
      },
    });
  },
);
