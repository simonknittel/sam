import type { Actor } from "../actor.js";

/**
 * The permission gate of the variant detail pages and everything scoped to
 * them (the embedded wiki, the backlink chips): members who manage their own
 * ships and members who may browse the org fleet.
 */
export const canViewVariantPages = (actor: Actor) =>
  actor.authorize("ship", "manage") || actor.authorize("orgFleet", "read");
