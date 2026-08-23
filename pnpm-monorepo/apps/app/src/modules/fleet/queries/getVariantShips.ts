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
} from "./shipQuery";

type CitizenFleetSort = "name-asc" | "name-desc";

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

      /**
       * The list only ever shows ships of the organization's members, thus
       * their permission gates it as well. It runs before the variant lookup
       * so that no filter in the query parameters can decide whether the
       * permission is checked.
       */
      const memberships = await getActiveOrganizationMemberships(ORG_ID);
      const citizenIds = memberships.map((membership) => membership.citizen.id);

      // Unknown variants and variants outside the filters both end here
      const matchingVariant = await prisma.variant.findFirst({
        where: {
          id: variantId,
          ...buildVariantFilterWhere({ flightReady, variantTagIds }),
        },
        select: { name: true },
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
          ownerId: { in: citizenIds },
          variantId,
          deletedAt: null,
        },
        select: {
          id: true,
          ownerId: true,
          name: true,
          owner: {
            select: { handle: true },
          },
        },
      });

      const [, sortDirection] = sort.split("-") as [string, "asc" | "desc"];
      const sortedShips = allShips.toSorted((a, b) =>
        sortDirection === "asc"
          ? sortAscWithAndNullLast(
              a.owner.handle || a.ownerId,
              b.owner.handle || b.ownerId,
            )
          : sortDescAndNullLast(
              a.owner.handle || a.ownerId,
              b.owner.handle || b.ownerId,
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
