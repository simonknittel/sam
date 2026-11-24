import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema, type PageOptions } from "../pagination.js";
import {
  listOwnerShips,
  ownerShipsInputShape,
  type ListShipsOutput,
} from "./ownerShips.js";

export const listCitizenShipsInputSchema = z.object({
  citizen_id: idSchema,
  ...ownerShipsInputShape,
});

export const listCitizenShips = async (
  context: ApplicationContext,
  actor: Actor,
  { citizen_id, ...input }: z.infer<typeof listCitizenShipsInputSchema>,
  options: PageOptions = {},
): Promise<ListShipsOutput> => {
  requirePermission(actor, "otherShips", "read");

  return listOwnerShips(context, citizen_id, input, options);
};
