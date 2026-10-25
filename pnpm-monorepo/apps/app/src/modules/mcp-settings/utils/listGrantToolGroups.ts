import { createActor, type Actor } from "@sam-monorepo/application";
import { listToolCatalogGroups } from "@sam-monorepo/mcp";

/**
 * The tools that a client of the actor gets in `tools/list`. The admin mode
 * of the grant applies, not the admin mode of the admin toolbar.
 */
export const listGrantToolGroups = (
  actor: Actor,
  isAdminModeEnabled: boolean,
) =>
  listToolCatalogGroups(
    createActor({ ...actor, adminMode: isAdminModeEnabled }),
  );
