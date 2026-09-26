import type {
  getMyAssignedRolesWithInheritance,
  getVisibleRoles,
} from "@/modules/roles/utils/getRoles";
import type { Entity, Role } from "@sam-monorepo/database/browser";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type AdditionalDataType = {
  roles: Awaited<ReturnType<typeof getVisibleRoles>>;
  assignedRoles: Awaited<ReturnType<typeof getMyAssignedRolesWithInheritance>>;
  /**
   * The flow page builds this map from `getCitizensGroupedByVisibleRoles()`.
   * The groups share the citizen objects, and the server-to-client
   * serialization of React sends a shared object only once.
   */
  citizensGroupedByVisibleRoles: ReadonlyMap<
    Role["id"],
    { readonly citizens: readonly Pick<Entity, "id" | "handle">[] }
  >;
};
