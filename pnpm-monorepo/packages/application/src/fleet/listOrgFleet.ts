import { ORG_ID } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { listActiveOrganizationMemberships } from "../organizations/organizationMemberships.js";
import {
  cursorSchema,
  pageLimitSchema,
  paginateByCursor,
  type PageOptions,
} from "../pagination.js";
import { withSpan } from "../withSpan.js";
import {
  acquisitionSourceFilterInputShape,
  buildAcquisitionSourceWhere,
  EMPTY_FLEET_VALUE,
  sumFleetValue,
  type FleetValueOutput,
} from "./shipAcquisitionSource.js";
import {
  buildVariantFilterWhere,
  SHIP_VARIANT_SELECT,
  toShipVariantOutput,
  variantFilterInputShape,
  type ShipVariantOutput,
} from "./shipVariant.js";

export enum OrgFleetSort {
  NameAscending = "name_asc",
  NameDescending = "name_desc",
  CountAscending = "count_asc",
  CountDescending = "count_desc",
}

export const listOrgFleetInputSchema = z.object({
  ...variantFilterInputShape,
  ...acquisitionSourceFilterInputShape,
  sort: z.enum(OrgFleetSort).default(OrgFleetSort.CountDescending),
  limit: pageLimitSchema,
  cursor: cursorSchema.optional(),
});

export interface OrgFleetEntryOutput {
  readonly variant: ShipVariantOutput;
  /** The ships of this variant that the members own */
  readonly count: number;
}

export interface ListOrgFleetOutput {
  readonly fleet: OrgFleetEntryOutput[];
  /** The members that own at least one ship that agrees with the filters */
  readonly total_citizens: number;
  /** The ships that agree with the filters */
  readonly total_ships: number;
  /** The value of the ships that agree with the filters */
  readonly value: FleetValueOutput;
  readonly next_cursor: string | null;
  readonly previous_cursor: string | null;
}

const compareFleetEntries =
  (sort: OrgFleetSort) =>
  (first: OrgFleetEntryOutput, second: OrgFleetEntryOutput) => {
    switch (sort) {
      case OrgFleetSort.NameAscending:
        return first.variant.name.localeCompare(second.variant.name);

      case OrgFleetSort.NameDescending:
        return second.variant.name.localeCompare(first.variant.name);

      case OrgFleetSort.CountAscending:
        return first.count - second.count;

      case OrgFleetSort.CountDescending:
        return second.count - first.count;

      default:
        throw new Error(`Unknown sort: ${sort satisfies never}`);
    }
  };

/**
 * The ships of the members of the organization, counted per variant. The
 * list has all variants that agree with the filters, also the variants
 * without ships (count 0). The members are the members that the member list
 * of the organization page shows to the actor. The cursor is the id of a
 * variant.
 *
 * @throws ValidationError when no variant has the cursor (see
 * `PageOptions.unknownCursor`)
 */
export const listOrgFleet = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof listOrgFleetInputSchema>,
  options: PageOptions = {},
): Promise<ListOrgFleetOutput> =>
  withSpan(context, "listOrgFleet", async () => {
    requirePermission(actor, "orgFleet", "read");

    const citizenIds = (
      await listActiveOrganizationMemberships(context, actor, ORG_ID)
    ).map((membership) => membership.citizen.id);
    if (citizenIds.length === 0)
      return {
        fleet: [],
        total_citizens: 0,
        total_ships: 0,
        value: EMPTY_FLEET_VALUE,
        next_cursor: null,
        previous_cursor: null,
      };

    const variantWhere = buildVariantFilterWhere({
      flightReady: input.flight_ready,
      variantTagIds: input.variant_tag_ids,
      manufacturerIds: input.manufacturer_ids,
      query: input.query,
    });

    // The ships are only counted, the variants come from the query below
    const [ships, variants] = await Promise.all([
      context.prisma.ship.findMany({
        where: {
          ownerId: { in: citizenIds },
          deletedAt: null,
          ...buildAcquisitionSourceWhere(input.acquisition_source),
          variant: variantWhere,
        },
        select: { ownerId: true, variantId: true, acquisitionSource: true },
      }),
      context.prisma.variant.findMany({
        where: variantWhere,
        select: SHIP_VARIANT_SELECT,
        // A stable order for the entries with the same sort value, thus the
        // cursor of a page stays valid
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
    ]);

    const shipsByVariantId = Map.groupBy(ships, (ship) => ship.variantId);
    const variantById = new Map(
      variants.map((variant) => [variant.id, variant]),
    );

    const sortedFleet = variants
      .map((variant) => ({
        variant: toShipVariantOutput(variant),
        count: shipsByVariantId.get(variant.id)?.length ?? 0,
      }))
      .sort(compareFleetEntries(input.sort));

    const page = paginateByCursor(sortedFleet, {
      ...options,
      cursor: input.cursor,
      pageSize: input.limit,
      getCursor: (entry) => entry.variant.id,
    });

    return {
      fleet: page.items,
      total_citizens: new Set(ships.map((ship) => ship.ownerId)).size,
      total_ships: ships.length,
      value: sumFleetValue(
        ships.map((ship) => ({
          acquisitionSource: ship.acquisitionSource,
          storePriceUsdCents:
            variantById.get(ship.variantId)?.storePriceUsdCents ?? null,
          inGamePriceAuec:
            variantById.get(ship.variantId)?.inGamePriceAuec ?? null,
        })),
      ),
      next_cursor: page.nextCursor,
      previous_cursor: page.previousCursor,
    };
  });
