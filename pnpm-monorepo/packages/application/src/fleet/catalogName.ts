import * as z from "zod";

/**
 * Arbitrary cap of the name of a manufacturer, a series or a variant. The
 * name fields of the catalog forms show one short line, thus only a crafted
 * request gets near the cap.
 */
const MAXIMUM_CATALOG_NAME_LENGTH = 255;

export const catalogNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAXIMUM_CATALOG_NAME_LENGTH);
