import * as z from "zod";

/**
 * The color input sends `#rrggbb`. The position puts the value into its
 * inline style, thus a different value could add CSS declarations.
 */
export const positionColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);
