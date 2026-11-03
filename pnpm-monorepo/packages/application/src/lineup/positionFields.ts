import { EventPositionRoleMatch } from "@sam-monorepo/database/browser";
import {
  MAXIMUM_POSITION_DESCRIPTION_LENGTH,
  MAXIMUM_POSITION_NAME_LENGTH,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { idSchema } from "../pagination.js";

/** The text size of the name of a position in the lineup */
export enum PositionFontSize {
  Normal = "normal",
  Large = "large",
}

/**
 * The value of the database column: `large`, or null for the normal size.
 * Undefined keeps the stored value.
 */
export const toStoredFontSize = (
  fontSize: PositionFontSize | null | undefined,
): string | null | undefined => {
  if (fontSize === undefined) return undefined;

  return fontSize === PositionFontSize.Large ? PositionFontSize.Large : null;
};

/**
 * The lineup form adds the required ship variants one at a time, thus a real
 * position has far fewer. The limit stops requests that are too large.
 */
const MAXIMUM_REQUIRED_VARIANTS = 250;

/**
 * Arbitrary (untested) cap of the required roles, like the required roles of
 * a task, to prevent a denial of service
 */
const MAXIMUM_REQUIRED_ROLES = 50;

/**
 * The color input of the app sends `#rrggbb`. The lineup puts the value into
 * the inline style of the position, thus a different value could add CSS
 * declarations. Without the flag `i`: the JSON Schema of the MCP tools has
 * no flags.
 */
const positionColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const positionNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAXIMUM_POSITION_NAME_LENGTH)
  .describe("The name of the position, for example a role on a ship.");

const positionDescriptionSchema = z
  .string()
  .trim()
  .max(MAXIMUM_POSITION_DESCRIPTION_LENGTH);

const requiredVariantIdsSchema = z
  .array(idSchema)
  .max(MAXIMUM_REQUIRED_VARIANTS)
  .describe(
    "The ship variants (from search_ship_variants) of which the citizen of the position flies one, in the order of preference.",
  );

const requiredRoleIdsSchema = z
  .array(idSchema)
  .max(MAXIMUM_REQUIRED_ROLES)
  .describe(
    "The roles (from list_roles) that the citizen of the position must have, as effective roles. required_role_match tells if the citizen needs all of them or one of them.",
  );

const requiredRoleMatchSchema = z
  .enum(EventPositionRoleMatch)
  .describe(
    "ALL: the citizen needs each required role. ANY: the citizen needs one of them.",
  );

/** Null resets a format; a field that is not given keeps its value */
const positionFormatSchemas = {
  font_size: z
    .enum(PositionFontSize)
    .nullish()
    .describe("The text size of the name. Null resets it to normal."),
  background_color: positionColorSchema
    .nullish()
    .describe("A color as #rrggbb, or null for the default color."),
  text_color: positionColorSchema
    .nullish()
    .describe("A color as #rrggbb, or null for the default color."),
};

/**
 * The fields of a new position. The use cases add the event or the event
 * template.
 */
export const newPositionFieldsSchema = z.object({
  parent_position_id: idSchema
    .optional()
    .describe(
      "A position of the same lineup (from get_event_lineup) that gets the new position as its last child. Without it, the new position is on the top level.",
    ),
  name: positionNameSchema,
  description: positionDescriptionSchema.optional(),
  required_variant_ids: requiredVariantIdsSchema.default([]),
  required_role_ids: requiredRoleIdsSchema.default([]),
  required_role_match: requiredRoleMatchSchema.default(
    EventPositionRoleMatch.ANY,
  ),
  ...positionFormatSchemas,
});

export type NewPositionFields = z.infer<typeof newPositionFieldsSchema>;

/** The fields of a position that an update changes. A missing field stays. */
export const positionChangeSchema = z.object({
  name: positionNameSchema.optional(),
  description: positionDescriptionSchema.optional(),
  required_variant_ids: requiredVariantIdsSchema
    .optional()
    .describe(
      "Replaces the required ship variants (from search_ship_variants), in the order of preference. An empty array removes them.",
    ),
  required_role_ids: requiredRoleIdsSchema
    .optional()
    .describe(
      "Replaces the required roles (from list_roles) that the user can see. The required roles that the user cannot see stay. An empty array removes the visible ones.",
    ),
  required_role_match: requiredRoleMatchSchema.optional(),
  ...positionFormatSchemas,
});

export type PositionChange = z.infer<typeof positionChangeSchema>;
