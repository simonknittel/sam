import * as z from "zod";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";

/** The length of the name field and of the note field of the forms */
const MAXIMUM_SHIP_TEXT_LENGTH = 255;

/** The name that the owner gives a ship. The forms permit an empty name. */
export const shipNameSchema = z.string().trim().max(MAXIMUM_SHIP_TEXT_LENGTH);

/** A short note of the owner about a ship. An empty note is no note. */
export const shipNoteSchema = z.string().trim().max(MAXIMUM_SHIP_TEXT_LENGTH);

/**
 * The ship of the owner that is not deleted. A ship of a different citizen
 * does not exist for the owner.
 *
 * @throws NotFoundError when the owner has no such ship
 */
export const requireOwnShip = async (
  context: ApplicationContext,
  ownerId: string,
  shipId: string,
) => {
  const ship = await context.prisma.ship.findFirst({
    where: { id: shipId, ownerId, deletedAt: null },
    select: { name: true, acquisitionSource: true, note: true },
  });
  if (!ship) throw new NotFoundError("The ship does not exist");

  return ship;
};
