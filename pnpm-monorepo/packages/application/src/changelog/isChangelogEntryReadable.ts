import type { Actor } from "../actor.js";
import type { ChangelogEntrySource } from "../context.js";

/**
 * The app shows an entry that is not readable redacted; the use cases leave it
 * out
 */
export const isChangelogEntryReadable = (
  actor: Actor,
  entry: Pick<ChangelogEntrySource, "requiresAuth">,
) =>
  !entry.requiresAuth ||
  actor.authorize(entry.requiresAuth.resource, entry.requiresAuth.operation);
