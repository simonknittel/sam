import { ShipAcquisitionSource } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import * as z from "zod";

export enum AcquisitionSource {
  /** The Star Citizen store, for real money */
  Store = "store",
  InGame = "in_game",
}

export enum AcquisitionSourceFilter {
  All = "all",
  Store = "store",
  InGame = "in_game",
  Unknown = "unknown",
}

export const acquisitionSourceSchema = z
  .enum(AcquisitionSource)
  .describe("Where the owner got the ship: in the store or in the game.");

export const acquisitionSourceFilterInputShape = {
  acquisition_source: z
    .enum(AcquisitionSourceFilter)
    .default(AcquisitionSourceFilter.All)
    .describe(
      "Only the ships with this acquisition source. unknown: only the ships that have no acquisition source.",
    ),
};

export const toAcquisitionSource = (
  source: ShipAcquisitionSource,
): AcquisitionSource => {
  switch (source) {
    case ShipAcquisitionSource.STORE:
      return AcquisitionSource.Store;

    case ShipAcquisitionSource.IN_GAME:
      return AcquisitionSource.InGame;

    default:
      throw new Error(
        `Unknown ship acquisition source: ${source satisfies never}`,
      );
  }
};

export const toShipAcquisitionSource = (
  source: AcquisitionSource,
): ShipAcquisitionSource => {
  switch (source) {
    case AcquisitionSource.Store:
      return ShipAcquisitionSource.STORE;

    case AcquisitionSource.InGame:
      return ShipAcquisitionSource.IN_GAME;

    default:
      throw new Error(`Unknown acquisition source: ${source satisfies never}`);
  }
};

export const buildAcquisitionSourceWhere = (
  filter: AcquisitionSourceFilter,
): Prisma.ShipWhereInput => {
  switch (filter) {
    case AcquisitionSourceFilter.All:
      return {};

    case AcquisitionSourceFilter.Store:
      return { acquisitionSource: ShipAcquisitionSource.STORE };

    case AcquisitionSourceFilter.InGame:
      return { acquisitionSource: ShipAcquisitionSource.IN_GAME };

    case AcquisitionSourceFilter.Unknown:
      return { acquisitionSource: null };

    default:
      throw new Error(
        `Unknown acquisition source filter: ${filter satisfies never}`,
      );
  }
};

export interface AcquisitionSourceValues {
  readonly store: number;
  readonly in_game: number;
  /** The ships without an acquisition source */
  readonly unknown: number;
}

/**
 * The sums of the prices of the variants. A variant without a price counts 0.
 */
export interface FleetValueOutput {
  /** The store prices, in USD cents */
  readonly usd_cents: AcquisitionSourceValues;
  /** The in-game prices, in aUEC */
  readonly auec: AcquisitionSourceValues;
}

const EMPTY_VALUES: AcquisitionSourceValues = {
  store: 0,
  in_game: 0,
  unknown: 0,
};

export const EMPTY_FLEET_VALUE: FleetValueOutput = {
  usd_cents: EMPTY_VALUES,
  auec: EMPTY_VALUES,
};

interface ValuedShip {
  readonly acquisitionSource: ShipAcquisitionSource | null;
  readonly storePriceUsdCents: number | null;
  readonly inGamePriceAuec: number | null;
}

const sumByAcquisitionSource = (
  ships: readonly ValuedShip[],
  getPrice: (ship: ValuedShip) => number | null,
): AcquisitionSourceValues => {
  const shipsBySource = Map.groupBy(ships, (ship) => ship.acquisitionSource);
  const sumOf = (source: ShipAcquisitionSource | null) =>
    (shipsBySource.get(source) ?? []).reduce(
      (sum, ship) => sum + (getPrice(ship) ?? 0),
      0,
    );

  return {
    store: sumOf(ShipAcquisitionSource.STORE),
    in_game: sumOf(ShipAcquisitionSource.IN_GAME),
    unknown: sumOf(null),
  };
};

export const sumFleetValue = (
  ships: readonly ValuedShip[],
): FleetValueOutput => ({
  usd_cents: sumByAcquisitionSource(ships, (ship) => ship.storePriceUsdCents),
  auec: sumByAcquisitionSource(ships, (ship) => ship.inGamePriceAuec),
});
