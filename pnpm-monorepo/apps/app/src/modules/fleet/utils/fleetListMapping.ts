import type { CursorDirection } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import {
  AcquisitionSourceFilter,
  FlightReadyFilter,
  ShipSort,
  toShipAcquisitionSource,
  toVariantStatus,
  type FleetValueOutput,
  type listMyShips,
  type ListShipsOutput,
  type ShipVariantOutput,
} from "@sam-monorepo/application";
import { FLEET_PAGE_SIZE, type ShipVariant } from "../queries/shipQuery";
import {
  AcquisitionSourceParameter,
  FleetSortParameter,
  FlightReadyParameter,
  ShowDeletedParameter,
  type ShipSortParameter,
} from "./fleetSearchParameters";

export const toFlightReadyFilter = (flightReady: FlightReadyParameter) =>
  flightReady === FlightReadyParameter.FlightReady
    ? FlightReadyFilter.Yes
    : FlightReadyFilter.All;

export const toAcquisitionSourceFilter = (
  acquisitionSource: AcquisitionSourceParameter,
) => {
  switch (acquisitionSource) {
    case AcquisitionSourceParameter.All:
      return AcquisitionSourceFilter.All;

    case AcquisitionSourceParameter.Store:
      return AcquisitionSourceFilter.Store;

    case AcquisitionSourceParameter.InGame:
      return AcquisitionSourceFilter.InGame;

    case AcquisitionSourceParameter.Unknown:
      return AcquisitionSourceFilter.Unknown;

    default:
      throw new Error(
        `Unknown acquisition source: ${acquisitionSource satisfies never}`,
      );
  }
};

export interface SourceValue {
  readonly usdCents: number;
  readonly auec: number;
}

export interface FleetValue {
  readonly store: SourceValue;
  readonly inGame: SourceValue;
  readonly unknown: SourceValue;
}

export const toFleetValue = (value: FleetValueOutput): FleetValue => ({
  store: { usdCents: value.usd_cents.store, auec: value.auec.store },
  inGame: { usdCents: value.usd_cents.in_game, auec: value.auec.in_game },
  unknown: { usdCents: value.usd_cents.unknown, auec: value.auec.unknown },
});

export const toShipVariant = (variant: ShipVariantOutput): ShipVariant => ({
  id: variant.id,
  name: variant.name,
  status: variant.status && toVariantStatus(variant.status),
  storePriceUsdCents: variant.store_price_usd_cents,
  inGamePriceAuec: variant.in_game_price_auec,
  series: {
    id: variant.series.id,
    name: variant.series.name,
    manufacturer: {
      id: variant.manufacturer.id,
      name: variant.manufacturer.name,
      image: variant.manufacturer.logo && {
        id: variant.manufacturer.logo.upload_id,
        mimeType: variant.manufacturer.logo.mime_type,
      },
    },
  },
  tags: variant.tags,
});

export interface OwnerFleetOptions {
  readonly flightReady?: FlightReadyParameter;
  readonly acquisitionSource?: AcquisitionSourceParameter;
  readonly variantTagIds?: string[];
  readonly manufacturerIds?: string[];
  readonly sort?: ShipSortParameter;
  readonly showDeleted?: ShowDeletedParameter;
  readonly searchQuery?: string | null;
  readonly cursor?: string | null;
  readonly direction?: CursorDirection;
}

export const toOwnerShipsInput = ({
  flightReady = FlightReadyParameter.All,
  acquisitionSource = AcquisitionSourceParameter.All,
  variantTagIds = [],
  manufacturerIds = [],
  sort = FleetSortParameter.NameAscending,
  showDeleted = ShowDeletedParameter.All,
  searchQuery,
  cursor,
}: OwnerFleetOptions): Parameters<typeof listMyShips>[2] => ({
  flight_ready: toFlightReadyFilter(flightReady),
  acquisition_source: toAcquisitionSourceFilter(acquisitionSource),
  variant_tag_ids: variantTagIds,
  manufacturer_ids: manufacturerIds,
  query: searchQuery || undefined,
  // "all" of the filter means all ships that are not deleted
  deleted: showDeleted === ShowDeletedParameter.Deleted,
  sort:
    sort === FleetSortParameter.NameDescending
      ? ShipSort.NameDescending
      : ShipSort.NameAscending,
  limit: FLEET_PAGE_SIZE,
  cursor: cursor ?? undefined,
});

export const toShipsPage = (output: ListShipsOutput) => ({
  ships: output.ships.map((ship) => ({
    id: ship.id,
    name: ship.name,
    acquisitionSource:
      ship.acquisition_source &&
      toShipAcquisitionSource(ship.acquisition_source),
    note: ship.note,
    deletedAt: ship.deleted_at === null ? null : new Date(ship.deleted_at),
    variant: toShipVariant(ship.variant),
  })),
  total: output.total,
  value: toFleetValue(output.value),
  nextCursor: output.next_cursor,
  prevCursor: output.previous_cursor,
});
