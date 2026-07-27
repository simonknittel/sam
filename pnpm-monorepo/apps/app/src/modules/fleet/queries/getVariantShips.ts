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
import { forbidden } from "next/navigation";
import { cache } from "react";

const ORG_ID = "cm4wm57sw0001opxo2c8oq0o0";

const MY_FLEET_PAGE_SIZE = 100;

type CitizenFleetSort = "name-asc" | "name-desc";

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
