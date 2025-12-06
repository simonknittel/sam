import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { VariantStatus, type Manufacturer, type Series } from "@prisma/client";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getActiveOrganizationMemberships } from "../organizations/queries";

const ORG_ID = "cm4wm57sw0001opxo2c8oq0o0"; // TODO: Implement UI for configuring org ID

export const getOrgFleet = cache(
  withTrace(
    "getOrgFleet",
    async ({ onlyFlightReady = false }: { onlyFlightReady?: boolean }) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("orgFleet", "read"))) forbidden();

      // Get discord IDs of all citizens with an active membership in the org
      const memberships = await getActiveOrganizationMemberships(ORG_ID);
      const discordIds = memberships
        .map((membership) => membership.citizen.discordId)
        .filter(Boolean) as string[];
      if (discordIds.length === 0) return [];

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
                  variant: {
                    status: onlyFlightReady
                      ? VariantStatus.FLIGHT_READY
                      : undefined,
                  },
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

      return accounts.flatMap((account) => account.user.ships);
    },
  ),
);

export const getMyFleet = cache(
  withTrace("getMyFleet", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("ship", "read"))) forbidden();

    return prisma.ship.findMany({
      where: {
        ownerId: authentication.session.user.id,
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
      },
    });
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
