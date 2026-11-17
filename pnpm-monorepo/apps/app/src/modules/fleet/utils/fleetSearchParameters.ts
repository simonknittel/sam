/** The values of the `flight_ready` search parameter of the fleet filters */
export enum FlightReadyParameter {
  All = "all",
  FlightReady = "flight_ready",
}

/** The values of the `sort` search parameter of the fleet lists */
export enum FleetSortParameter {
  NameAscending = "name-asc",
  NameDescending = "name-desc",
  /** Only the fleet of the organization sorts by the number of ships */
  CountAscending = "count-asc",
  CountDescending = "count-desc",
}

/** The sort values of the ship lists, which do not count ships */
export type ShipSortParameter =
  FleetSortParameter.NameAscending | FleetSortParameter.NameDescending;

export const SHIP_SORT_PARAMETERS: readonly ShipSortParameter[] = [
  FleetSortParameter.NameAscending,
  FleetSortParameter.NameDescending,
];

/** The values of the `acquisition_source` search parameter of the fleet filters */
export enum AcquisitionSourceParameter {
  All = "all",
  Store = "store",
  InGame = "in_game",
  /** The ships from before the app recorded the acquisition source */
  Unknown = "unknown",
}

/** The values of the `showDeleted` search parameter of the ship lists */
export enum ShowDeletedParameter {
  All = "all",
  Deleted = "deleted",
}
