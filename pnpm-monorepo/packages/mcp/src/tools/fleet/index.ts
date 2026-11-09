import type { CatalogTool } from "../../toolDefinition.js";
import { createShipTool } from "./createShip.js";
import { createShipManufacturerTool } from "./createShipManufacturer.js";
import { createShipSeriesTool } from "./createShipSeries.js";
import { createShipVariantTool } from "./createShipVariant.js";
import { deleteShipTool } from "./deleteShip.js";
import { deleteShipManufacturerTool } from "./deleteShipManufacturer.js";
import { deleteShipSeriesTool } from "./deleteShipSeries.js";
import { deleteShipVariantTool } from "./deleteShipVariant.js";
import { getShipVariantTool } from "./getShipVariant.js";
import { listMyShipsTool } from "./listMyShips.js";
import { listOrgFleetTool } from "./listOrgFleet.js";
import { listShipManufacturersTool } from "./listShipManufacturers.js";
import { renameShipTool } from "./renameShip.js";
import { searchShipVariantsTool } from "./searchShipVariants.js";
import { updateShipManufacturerTool } from "./updateShipManufacturer.js";
import { updateShipSeriesTool } from "./updateShipSeries.js";
import { updateShipVariantTool } from "./updateShipVariant.js";

export const fleetTools: readonly CatalogTool[] = [
  createShipTool,
  createShipManufacturerTool,
  createShipSeriesTool,
  createShipVariantTool,
  deleteShipTool,
  deleteShipManufacturerTool,
  deleteShipSeriesTool,
  deleteShipVariantTool,
  getShipVariantTool,
  listMyShipsTool,
  listOrgFleetTool,
  listShipManufacturersTool,
  renameShipTool,
  searchShipVariantsTool,
  updateShipManufacturerTool,
  updateShipSeriesTool,
  updateShipVariantTool,
];
