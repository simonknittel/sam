import * as z from "zod";

const MAXIMUM_TOOL_NAME_LENGTH = 64;

/**
 * Does not make sure that the tool exists: the catalog of the tools is in the
 * MCP package. The host checks the name with `isCatalogToolName()`.
 */
export const mcpToolNameSchema = z
  .string()
  .max(MAXIMUM_TOOL_NAME_LENGTH)
  .regex(/^[a-z][a-z0-9_]*$/);
