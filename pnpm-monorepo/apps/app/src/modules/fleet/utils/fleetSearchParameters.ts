export enum FlightReadyParameter {
  All = "all",
  FlightReady = "flight_ready",
}

export enum FleetSortParameter {
  NameAscending = "name-asc",
  NameDescending = "name-desc",
  /** Only the fleet of the organization sorts by the number of ships */
  CountAscending = "count-asc",
  CountDescending = "count-desc",
}

export type ShipSortParameter =
  FleetSortParameter.NameAscending | FleetSortParameter.NameDescending;

export const SHIP_SORT_PARAMETERS: readonly ShipSortParameter[] = [
  FleetSortParameter.NameAscending,
  FleetSortParameter.NameDescending,
];

export enum AcquisitionSourceParameter {
  All = "all",
  Store = "store",
  InGame = "in_game",
  Unknown = "unknown",
}

export enum ShowDeletedParameter {
  All = "all",
  Deleted = "deleted",
}
