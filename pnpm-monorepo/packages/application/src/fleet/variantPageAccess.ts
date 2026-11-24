import type { Actor } from "../actor.js";

/**
 * The gate of the variant pages and everything scoped to them (the embedded
 * wiki, the backlink chips)
 */
export const canViewVariantPages = (actor: Actor) =>
  actor.authorize("ship", "manage") || actor.authorize("orgFleet", "read");
