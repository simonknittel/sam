import {
  ShipVariantStatus,
  toVariantStatus,
  type Actor,
} from "@sam-monorepo/application";
import * as z from "zod";
import { shipVariantOutputSchema } from "./shipVariantOutputSchema.js";

/** The permission of all write tools of the ship catalog */
export const canManageShipCatalog = (actor: Actor) =>
  actor.authorize("manufacturersSeriesAndVariants", "manage");

export const shipManufacturerOutputSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
});

export const shipSeriesOutputSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  manufacturer_id: z.string(),
});

/** A variant with the fields that update_ship_variant can change */
export const shipVariantDetailOutputSchema = shipVariantOutputSchema.extend({
  links: z.array(z.strictObject({ service: z.string(), url: z.string() })),
  wiki_page_id: z
    .string()
    .nullable()
    .describe("The page of the global wiki that the variant page embeds."),
  ship_count: z
    .number()
    .int()
    .min(0)
    .describe(
      "The ships of the variant that the active citizens own. A delete of the variant deletes them.",
    ),
});

/**
 * The status in the format of the outputs. The use cases take the status of
 * the forms of the web app.
 */
export const shipVariantStatusInputShape = {
  status: z
    .enum(ShipVariantStatus)
    .optional()
    .describe("Whether the variant is flight ready in the game."),
};

export const toVariantStatusInput = (status: ShipVariantStatus | undefined) =>
  status === undefined ? undefined : toVariantStatus(status);
