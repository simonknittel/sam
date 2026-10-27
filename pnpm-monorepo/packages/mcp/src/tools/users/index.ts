import type { CatalogTool } from "../../toolDefinition.js";
import { getUserTool } from "./getUser.js";
import { listUsersTool } from "./listUsers.js";

export const usersTools: readonly CatalogTool[] = [getUserTool, listUsersTool];
