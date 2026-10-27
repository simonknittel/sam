/** The use cases of the roles group. */
export {
  autoAssignInactiveRoles,
  type AutoAssignInactiveRolesOutput,
} from "./autoAssignInactiveRoles.js";
export {
  changeRoleAssignmentLevelInputSchema,
  decreaseRoleAssignmentLevel,
  increaseRoleAssignmentLevel,
  type ChangeRoleAssignmentLevelInput,
  type ChangeRoleAssignmentLevelOutput,
} from "./changeRoleAssignmentLevel.js";
export {
  changeRolePermissions,
  changeRolePermissionsInputSchema,
  type ChangeRolePermissionsInput,
  type ChangeRolePermissionsOutput,
} from "./changeRolePermissions.js";
export {
  countCitizensPerRole,
  type CountCitizensPerRoleOutput,
} from "./countCitizensPerRole.js";
export {
  createRole,
  createRoleInputSchema,
  type CreateRoleInput,
  type CreateRoleOutput,
} from "./createRole.js";
export {
  createRoleTag,
  createRoleTagInputSchema,
  type CreateRoleTagInput,
  type CreateRoleTagOutput,
} from "./createRoleTag.js";
export {
  deleteRole,
  deleteRoleInputSchema,
  type DeleteRoleInput,
  type DeleteRoleOutput,
} from "./deleteRole.js";
export {
  deleteRoleAssignment,
  deleteRoleAssignmentInputSchema,
  type DeleteRoleAssignmentInput,
  type DeleteRoleAssignmentOutput,
} from "./deleteRoleAssignment.js";
export {
  deleteRoleTag,
  deleteRoleTagInputSchema,
  type DeleteRoleTagInput,
  type DeleteRoleTagOutput,
} from "./deleteRoleTag.js";
export {
  findManagedRole,
  findManagedRoleTag,
  findManagedRoleTags,
  type ManagedRole,
  type ManagedRoleTag,
} from "./findManagedRole.js";
export {
  getPermissionCatalog,
  getPermissionCatalogInputSchema,
  type CatalogPermissionOutput,
  type GetPermissionCatalogOutput,
} from "./getPermissionCatalog.js";
export {
  getRole,
  getRoleInputSchema,
  type GetRoleInput,
  type GetRoleOutput,
} from "./getRole.js";
export {
  listRoles,
  listRolesInputSchema,
  type ListRolesInput,
  type ListRolesOutput,
} from "./listRoles.js";
export {
  listRoleTags,
  listRoleTagsInputSchema,
  type ListRoleTagsInput,
  type ListRoleTagsOutput,
} from "./listRoleTags.js";
export {
  removeExpiredRoleAssignments,
  type RemoveExpiredRoleAssignmentsOutput,
} from "./removeExpiredRoleAssignments.js";
export {
  findInheritanceMatrixRoles,
  findPermissionMatrixRoles,
  findRoleTableRows,
  type InheritanceMatrixRole,
  type PermissionMatrixRole,
  type RoleIcon,
  type RoleTableRow,
} from "./roleAdministrationRows.js";
export {
  findRoleAssignmentChanges,
  findRoleAssignmentLevelChanges,
  type RoleAssignmentChangeRow,
  type RoleAssignmentHistoryInput,
  type RoleAssignmentLevelChangeRow,
} from "./roleAssignmentHistory.js";
export {
  findAllRoleBadges,
  findAssignableRoleBadges,
  findOwnAssignedRoleBadges,
  findVisibleRoleBadges,
  type OwnAssignedRoleBadge,
  type RoleBadge,
} from "./roleBadges.js";
export {
  RoleAssignmentErrorMessage,
  RoleErrorMessage,
  RoleTagErrorMessage,
} from "./roleErrors.js";
export type { RoleOutput } from "./roleOutput.js";
export {
  findPickerRoleTagBadges,
  findVisibleRoleTagBadges,
  type RoleTagBadge,
} from "./roleTagBadges.js";
export type { RoleTagOutput, RoleTagReference } from "./roleTagOutput.js";
export { canSeeAnyRole } from "./roleVisibility.js";
export {
  setRoleInheritance,
  setRoleInheritanceInputSchema,
  type SetRoleInheritanceInput,
  type SetRoleInheritanceOutput,
} from "./setRoleInheritance.js";
export {
  setRolePermission,
  setRolePermissionInputSchema,
  type SetRolePermissionInput,
  type SetRolePermissionOutput,
} from "./setRolePermission.js";
export {
  updateRole,
  updateRoleInputSchema,
  type UpdateRoleInput,
  type UpdateRoleOutput,
} from "./updateRole.js";
export {
  updateRoleAssignments,
  updateRoleAssignmentsInputSchema,
  type RoleAssignmentUpdate,
  type UpdateRoleAssignmentsInput,
  type UpdateRoleAssignmentsOutput,
} from "./updateRoleAssignments.js";
export {
  updateRoleInheritance,
  updateRoleInheritanceInputSchema,
  type UpdateRoleInheritanceInput,
  type UpdateRoleInheritanceOutput,
} from "./updateRoleInheritance.js";
export {
  updateRolePermissions,
  updateRolePermissionsInputSchema,
  type UpdateRolePermissionsInput,
  type UpdateRolePermissionsOutput,
} from "./updateRolePermissions.js";
export {
  updateRoleTag,
  updateRoleTagInputSchema,
  type UpdateRoleTagInput,
  type UpdateRoleTagOutput,
} from "./updateRoleTag.js";
