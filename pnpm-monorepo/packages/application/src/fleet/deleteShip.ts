import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { SHIP_SELECT, toShipOutput, type ShipOutput } from "./ownerShips.js";
import { requireOwnShip } from "./ownShip.js";

export const deleteShipInputSchema = z.object({
  ship_id: idSchema.describe("An own ship from list_my_ships."),
});

export const deleteShip = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof deleteShipInputSchema>,
): Promise<ShipOutput> =>
  withSpan(context, "deleteShip", async () => {
    requirePermission(actor, "ship", "manage");
    const owner = requireCitizen(actor);

    await requireOwnShip(context, owner.id, input.ship_id);

    const ship = await context.prisma.ship.update({
      where: { id: input.ship_id, ownerId: owner.id },
      data: { deletedAt: context.now(), deletedById: owner.id },
      select: SHIP_SELECT,
    });

    await context.audit.create([
      {
        type: AuditEventType.SHIP_DELETED_V2,
        data: {
          shipId: ship.id,
          ownerId: owner.id,
          name: ship.name,
          variantId: ship.variant.id,
        },
        createdById: actor.userId,
      },
    ]);

    return toShipOutput(ship);
  });
