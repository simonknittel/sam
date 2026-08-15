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
  type ShipVariant,
} from "./shipQuery";

type CitizenFleetSort = "name-asc" | "name-desc";

interface VariantShipRow {
  id: string;
  ownerId: string;
  variantId: string;
  name: string | null;
  owner: {
    accounts: { providerAccountId: string }[];
  };
  variant: ShipVariant;
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
        ...buildVariantFilterWhere({ flightReady, variantTagIds }),
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
            include: SHIP_VARIANT_INCLUDE,
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
        total: sortedShips.length,
        nextCursor,
        prevCursor,
        variantName: matchingVariant.name,
      };
    },
  ),
);
