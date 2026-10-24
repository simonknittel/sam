import * as z from "zod";

/** The names of the MCP tools are lowercase snake_case */
const MAXIMUM_TOOL_NAME_LENGTH = 64;

/**
 * The name of an MCP tool. The catalog of the tools is in the MCP package,
 * thus the schema does not make sure that the tool exists. The host checks
 * the name with `isCatalogToolName()` of the MCP package.
 */
export const mcpToolNameSchema = z
  .string()
  .max(MAXIMUM_TOOL_NAME_LENGTH)
  .regex(/^[a-z][a-z0-9_]*$/);
