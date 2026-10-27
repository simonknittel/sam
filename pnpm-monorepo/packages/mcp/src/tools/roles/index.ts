import type { CatalogTool } from "../../toolDefinition.js";
import { changeRolePermissionsTool } from "./changeRolePermissions.js";
import { createRoleTagTool } from "./createRoleTag.js";
import { deleteRoleTagTool } from "./deleteRoleTag.js";
import { getPermissionCatalogTool } from "./getPermissionCatalog.js";
import { getRoleTool } from "./getRole.js";
import { listRolesTool } from "./listRoles.js";
import { listRoleTagsTool } from "./listRoleTags.js";
import { updateRoleTool } from "./updateRole.js";
import { updateRoleTagTool } from "./updateRoleTag.js";

export const rolesTools: readonly CatalogTool[] = [
  changeRolePermissionsTool,
  createRoleTagTool,
  deleteRoleTagTool,
  getPermissionCatalogTool,
  getRoleTool,
  listRolesTool,
  listRoleTagsTool,
  updateRoleTool,
  updateRoleTagTool,
];
