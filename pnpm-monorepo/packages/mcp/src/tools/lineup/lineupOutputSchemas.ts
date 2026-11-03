import type { Actor } from "@sam-monorepo/application";
import * as z from "zod";
import { citizenReferenceSchema, eventReferenceSchema } from "../../schemas.js";

const positionFields = {
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  required_variants: z.array(
    z.strictObject({
      id: z.string(),
      name: z.string(),
    }),
  ),
  assignee: citizenReferenceSchema
    .nullable()
    .describe(
      "Null when nobody is assigned or the assigned citizen is deleted.",
    ),
  applications: z
    .array(citizenReferenceSchema)
    .describe(
      "The citizens who applied. Empty when the user cannot manage the positions.",
    ),
};

const createPositionSchema = <Children extends z.ZodType>(children: Children) =>
  z.strictObject({ ...positionFields, children: z.array(children) });

/**
 * The lineup has at most four levels (see the position tree of the use
 * case), thus the positions of the fourth level have no children. The
 * schema names the levels instead of a recursive reference.
 */
const fourthLevelPositionSchema = z.strictObject({
  ...positionFields,
  children: z.tuple([]),
});

/** A position with its children, as the lineup tools give it */
export const lineupPositionSchema = createPositionSchema(
  createPositionSchema(createPositionSchema(fourthLevelPositionSchema)),
);

export const eventLineupSchema = z.strictObject({
  event: eventReferenceSchema,
  can_manage_positions: z.boolean(),
  is_updatable: z
    .boolean()
    .describe(
      "False after the end of the event: then the lineup cannot change.",
    ),
  positions: z.array(lineupPositionSchema),
});

/**
 * The lineup tools give the positions like `get_event_lineup`, thus they
 * need its permissions: `event;read`, `ship;read` and a citizen. The use
 * cases check the rules of the event.
 */
export const isLineupToolVisible = (actor: Actor) =>
  actor.authorize("event", "read") &&
  actor.authorize("ship", "read") &&
  actor.citizen !== null;
