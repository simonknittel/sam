import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { SHIP_SELECT, toShipOutput, type ShipOutput } from "./ownerShips.js";
import { requireOwnShip, shipNameSchema, shipNoteSchema } from "./ownShip.js";
import {
  acquisitionSourceSchema,
  toShipAcquisitionSource,
} from "./shipAcquisitionSource.js";

export const updateShipInputSchema = z.object({
  ship_id: idSchema.describe("An own ship from list_my_ships."),
  name: shipNameSchema
    .optional()
    .describe("The new name. An empty name removes the name."),
  acquisition_source: acquisitionSourceSchema.optional(),
  note: shipNoteSchema
    .optional()
    .describe(
      "The new short note of the owner about the ship. An empty note removes the note.",
    ),
});

/** An absent field stays */
export const updateShip = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof updateShipInputSchema>,
): Promise<ShipOutput> =>
  withSpan(context, "updateShip", async () => {
    requirePermission(actor, "ship", "manage");
    const owner = requireCitizen(actor);

    const previousShip = await requireOwnShip(context, owner.id, input.ship_id);

    const ship = await context.prisma.ship.update({
      where: { id: input.ship_id, ownerId: owner.id },
      data: {
        name: input.name,
        acquisitionSource:
          input.acquisition_source &&
          toShipAcquisitionSource(input.acquisition_source),
        note: input.note === undefined ? undefined : input.note || null,
        updatedById: owner.id,
      },
      select: SHIP_SELECT,
    });

    await context.audit.create([
      {
        type: AuditEventType.SHIP_UPDATED_V3,
        data: {
          shipId: ship.id,
          ownerId: owner.id,
          previousName: previousShip.name,
          newName: ship.name,
          previousAcquisitionSource: previousShip.acquisitionSource,
          newAcquisitionSource: ship.acquisitionSource,
          previousNote: previousShip.note,
          newNote: ship.note,
        },
        createdById: actor.userId,
      },
    ]);

    return toShipOutput(ship);
  });
