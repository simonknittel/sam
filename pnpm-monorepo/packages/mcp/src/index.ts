/**
 * The MCP server of SAM: the tools and the request handler that verifies the
 * bearer token and builds the principal. The package does not depend on a
 * host. A host (for example a Next.js route) applies its kill switch, builds
 * the application context and calls the request handler.
 */
export {
  isCatalogToolName,
  listToolCatalogGroups,
  type ToolCatalogGroup,
} from "./catalog.js";
export {
  createMcpRequestHandler,
  type McpRequestHandler,
} from "./createMcpRequestHandler.js";
export { ToolKind, type ToolCatalogEntry } from "./toolDefinition.js";
export { ToolGroup } from "./toolGroup.js";
