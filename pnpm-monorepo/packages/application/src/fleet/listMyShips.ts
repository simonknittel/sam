import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import type { PageOptions } from "../pagination.js";
import {
  listOwnerShips,
  ownerShipsInputShape,
  type ListShipsOutput,
} from "./ownerShips.js";
import { EMPTY_FLEET_VALUE } from "./shipAcquisitionSource.js";

export const listMyShipsInputSchema = z.object(ownerShipsInputShape);

/**
 * The ships of the own citizen. A user without a citizen has no ships. The
 * permission is `ship;manage`, like the page of the own ships.
 */
export const listMyShips = async (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof listMyShipsInputSchema>,
  options: PageOptions = {},
): Promise<ListShipsOutput> => {
  requirePermission(actor, "ship", "manage");

  if (!actor.citizen)
    return {
      ships: [],
      total: 0,
      value: EMPTY_FLEET_VALUE,
      next_cursor: null,
      previous_cursor: null,
    };

  return listOwnerShips(context, actor.citizen.id, input, options);
};
