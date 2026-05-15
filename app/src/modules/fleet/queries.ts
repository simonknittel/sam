import { prisma } from "@/db";
import {
  VariantStatus,
  type Manufacturer,
  type Series,
  type Ship,
  type Upload,
  type Variant,
  type VariantTag,
} from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import { withTrace } from "@/modules/tracing/utils/withTrace";
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
      sort = "count-desc",
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

const MY_FLEET_PAGE_SIZE = 100;

type MyFleetSort = "name-asc" | "name-desc";

export const getMyFleet = cache(
  withTrace(
    "getMyFleet",
    async ({
      flightReady = "all",
      variantTagIds = [],
      sort = "name-asc",
      showDeleted = "all",
      cursor,
      direction = "next",
    }: {
      flightReady?: "all" | "flight_ready";
      variantTagIds?: string[];
      sort?: MyFleetSort;
      showDeleted?: "all" | "deleted";
      cursor?: string | null;
      direction?: "next" | "prev";
    } = {}) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("ship", "read"))) forbidden();

      const shipWhere: Record<string, unknown> = {
        ownerId: authentication.session.user.id,
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
        deletedAt: null,
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
            ships: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
        tags: true,
        externalLinks: true,
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

type CitizenFleetSort = "name-asc" | "name-desc";

export const getCitizenFleet = cache(
  withTrace(
    "getCitizenFleet",
    async (
      citizenId: string,
      {
        flightReady = "all",
        variantTagIds = [],
        sort = "name-asc",
        showDeleted = "all",
        cursor,
        direction = "next",
      }: {
        flightReady?: "all" | "flight_ready";
        variantTagIds?: string[];
        sort?: CitizenFleetSort;
        showDeleted?: "all" | "deleted";
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

interface VariantShipRow {
  id: string;
  ownerId: string;
  variantId: string;
  name: string | null;
  owner: {
    accounts: { providerAccountId: string }[];
  };
  variant: {
    id: string;
    name: string;
    seriesId: string;
    status: VariantStatus | null;
    series: {
      id: string;
      name: string;
      manufacturerId: string;
      manufacturer: Manufacturer & { image: Upload | null };
    };
    tags: VariantTag[];
  };
  citizenHandle: string | null;
  citizenId: string | null;
}

export const getVariantShips = cache(
  withTrace(
    "getVariantShips",
    async (
      variantId: string,
      {
        flightReady = "all",
        variantTagIds = [],
        sort = "name-asc",
        cursor,
        direction = "next",
      }: {
        flightReady?: "all" | "flight_ready";
        variantTagIds?: string[];
        sort?: CitizenFleetSort;
        cursor?: string | null;
        direction?: "next" | "prev";
      } = {},
    ) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("otherShips", "read"))) forbidden();

      // Verify variant exists
      const variant = await prisma.variant.findUnique({
        where: { id: variantId },
        select: { id: true },
      });
      if (!variant) {
        return {
          ships: [],
          total: 0,
          nextCursor: null,
          prevCursor: null,
          variantName: null as string | null,
        };
      }

      // Get org members' Discord IDs -> Account -> User IDs
      const memberships = await getActiveOrganizationMemberships(ORG_ID);
      const discordIds = memberships
        .map((m) => m.citizen.discordId)
        .filter(Boolean) as string[];

      if (discordIds.length === 0) {
        return {
          ships: [],
          total: 0,
          nextCursor: null,
          prevCursor: null,
          variantName: null,
        };
      }

      const accounts = await prisma.account.findMany({
        where: { providerAccountId: { in: discordIds } },
        select: { userId: true, providerAccountId: true },
      });
      const userIds = accounts.map((a) => a.userId);

      // Build a Discord ID -> citizen mapping
      const discordToCitizen = new Map<
        string,
        { id: string; handle: string | null }
      >();
      for (const membership of memberships) {
        if (membership.citizen.discordId) {
          discordToCitizen.set(membership.citizen.discordId, {
            id: membership.citizen.id,
            handle: membership.citizen.handle,
          });
        }
      }

      const variantWhere: Record<string, unknown> = {
        id: variantId,
        ...(flightReady === "flight_ready"
          ? { status: VariantStatus.FLIGHT_READY }
          : {}),
        ...(variantTagIds.length > 0
          ? { tags: { some: { id: { in: variantTagIds } } } }
          : {}),
      };

      // If variant doesn't match filters, return empty
      const matchingVariant = await prisma.variant.findFirst({
        where: variantWhere,
        select: { id: true, name: true },
      });
      if (!matchingVariant) {
        return {
          ships: [],
          total: 0,
          nextCursor: null,
          prevCursor: null,
          variantName: null,
        };
      }

      const allShips = await prisma.ship.findMany({
        where: {
          ownerId: { in: userIds },
          variantId,
          deletedAt: null,
        },
        include: {
          owner: {
            select: {
              accounts: {
                select: { providerAccountId: true },
              },
            },
          },
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

      // Resolve citizen info for each ship
      const shipsWithCitizen: VariantShipRow[] = allShips.map((ship) => {
        const accountDiscordId = ship.owner.accounts[0]?.providerAccountId;
        const citizen = accountDiscordId
          ? discordToCitizen.get(accountDiscordId)
          : null;
        return {
          ...ship,
          citizenHandle: citizen?.handle ?? null,
          citizenId: citizen?.id ?? null,
        };
      });

      const [, sortDirection] = sort.split("-") as [string, "asc" | "desc"];
      const sortedShips = shipsWithCitizen.toSorted((a, b) =>
        sortDirection === "asc"
          ? sortAscWithAndNullLast(
              a.citizenHandle || a.ownerId,
              b.citizenHandle || b.ownerId,
            )
          : sortDescAndNullLast(
              a.citizenHandle || a.ownerId,
              b.citizenHandle || b.ownerId,
            ),
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
        total: shipsWithCitizen.length,
        nextCursor:
          hasNextPage && ships.length > 0 ? ships[ships.length - 1].id : null,
        prevCursor: hasPrevPage && ships.length > 0 ? ships[0].id : null,
        variantName: matchingVariant.name,
      };
    },
  ),
);

export const getVariantShipsVariantTags = cache(
  withTrace("getVariantShipsVariantTags", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("otherShips", "read"))) forbidden();

    return prisma.variantTag.findMany({
      distinct: ["id"],
      orderBy: [{ key: "asc" }, { value: "asc" }],
    });
  }),
);

export const getVariantById = cache(
  withTrace("getVariantById", async (id: Variant["id"]) => {
    await requireAuthentication();

    return prisma.variant.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
  }),
);

const SHIP_CHANGES_PAGE_SIZE = 100;

export interface ShipChangeRow {
  changeDate: Date;
  changeType: "creation" | "deletion";
  ship: Ship & {
    variant: Variant & {
      series: Series & {
        manufacturer: Manufacturer & {
          image: Upload | null;
        };
      };
    };
  };
  actorId?: string | null;
  actorHandle?: string | null;
}

export const getShipChanges = cache(
  withTrace(
    "getShipChanges",
    async ({
      variantIds = [],
      changeType = "both",
      cursor,
      direction = "next",
    }: {
      variantIds?: string[];
      changeType?: "both" | "creation" | "deletion";
      cursor?: string | null;
      direction?: "next" | "prev";
    } = {}) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("otherShips", "read"))) forbidden();

      const baseVariantWhere: Record<string, unknown> = {
        ...(variantIds.length > 0 ? { id: { in: variantIds } } : {}),
      };

      const [createdShips, deletedShips] = await Promise.all([
        changeType === "deletion"
          ? Promise.resolve([])
          : prisma.ship.findMany({
              where: {
                deletedAt: null,
                variant: baseVariantWhere,
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
                  },
                },
                createdBy: {
                  select: {
                    id: true,
                    handle: true,
                  },
                },
              },
            }),
        changeType === "creation"
          ? Promise.resolve([])
          : prisma.ship.findMany({
              where: {
                deletedAt: { not: null },

                variant: baseVariantWhere,
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
                  },
                },
                deletedBy: {
                  select: {
                    id: true,
                    handle: true,
                  },
                },
              },
            }),
      ]);

      const changes: ShipChangeRow[] = [
        ...createdShips.map((ship) => ({
          changeDate: ship.createdAt!,
          changeType: "creation" as const,
          ship,
          actorId: ship.createdById,
          actorHandle: ship.createdBy?.handle,
        })),
        ...deletedShips.map((ship) => ({
          changeDate: ship.deletedAt!,
          changeType: "deletion" as const,
          ship,
          actorId: ship.deletedById,
          actorHandle: ship.deletedBy?.handle,
        })),
      ];

      const sorted = changes.toSorted(
        (a, b) => b.changeDate.getTime() - a.changeDate.getTime(),
      );

      const cursorKey = (c: ShipChangeRow) => `${c.ship.id}:${c.changeType}`;

      const cursorIndex = cursor
        ? sorted.findIndex((c) => cursorKey(c) === cursor)
        : -1;

      let pageItems: ShipChangeRow[];

      if (!cursor) {
        pageItems = sorted.slice(0, SHIP_CHANGES_PAGE_SIZE + 1);
      } else if (direction === "next") {
        const fromIndex = cursorIndex !== -1 ? cursorIndex + 1 : 0;
        pageItems = sorted.slice(
          fromIndex,
          fromIndex + SHIP_CHANGES_PAGE_SIZE + 1,
        );
      } else {
        const toIndex = cursorIndex !== -1 ? cursorIndex : sorted.length;
        const fromIndex = Math.max(0, toIndex - SHIP_CHANGES_PAGE_SIZE - 1);
        pageItems = sorted.slice(fromIndex, toIndex);
      }

      const hasMore = pageItems.length > SHIP_CHANGES_PAGE_SIZE;

      let items: ShipChangeRow[];
      if (hasMore) {
        items =
          direction === "next"
            ? pageItems.slice(0, SHIP_CHANGES_PAGE_SIZE)
            : pageItems.slice(1);
      } else {
        items = pageItems;
      }

      const hasNextPage = direction === "next" ? hasMore : !!cursor;
      const hasPrevPage = direction === "prev" ? hasMore : !!cursor;

      return {
        changes: items,
        nextCursor:
          hasNextPage && items.length > 0
            ? cursorKey(items[items.length - 1])
            : null,
        prevCursor:
          hasPrevPage && items.length > 0 ? cursorKey(items[0]) : null,
      };
    },
  ),
);

export const getShipChangesVariants = cache(
  withTrace("getShipChangesVariants", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("otherShips", "read"))) forbidden();

    return prisma.variant.findMany({
      select: {
        id: true,
        name: true,
        series: {
          select: {
            name: true,
            manufacturer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }),
);
