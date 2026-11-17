import { ShipAcquisitionSource } from "@sam-monorepo/database/browser";

export const ACQUISITION_SOURCE_LABEL = {
  [ShipAcquisitionSource.STORE]: "Store",
  [ShipAcquisitionSource.IN_GAME]: "In-game",
} as const satisfies Record<ShipAcquisitionSource, string>;

/** The label of the ships from before the app recorded the acquisition source */
export const UNKNOWN_ACQUISITION_SOURCE_LABEL = "Nicht angegeben";
