import type { CatalogTool } from "../../toolDefinition.js";
import { changeRolePermissionsTool } from "./changeRolePermissions.js";
import { getPermissionCatalogTool } from "./getPermissionCatalog.js";
import { getRoleTool } from "./getRole.js";
import { listRolesTool } from "./listRoles.js";
import { updateRoleTool } from "./updateRole.js";

export const rolesTools: readonly CatalogTool[] = [
  changeRolePermissionsTool,
  getPermissionCatalogTool,
  getRoleTool,
  listRolesTool,
  updateRoleTool,
];
