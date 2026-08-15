import type { PermissionSet } from "@sam-monorepo/permissions";

interface Authorizer {
  readonly authorize: (
    resource: PermissionSet["resource"],
    operation: PermissionSet["operation"],
  ) => Promise<boolean>;
}

/**
 * The permission gate of the variant detail pages and everything scoped to
 * them (the embedded wiki, the backlink chips): fleet managers and members
 * who may browse the org fleet.
 */
export const canViewVariantPages = async (authentication: Authorizer) => {
  const [hasShipManage, hasOrgFleetRead] = await Promise.all([
    authentication.authorize("ship", "manage"),
    authentication.authorize("orgFleet", "read"),
  ]);

  return hasShipManage || hasOrgFleetRead;
};
