import { requirePermission, type Actor } from "./actor.js";

/**
 * The one permission that gates the MCP server: the consent page, the
 * creation of a grant, the token requests, the settings of an own grant and
 * each request with an access token. A role without it cannot connect a
 * client or use a connected client.
 */
export const canUseMcp = (actor: Actor): boolean =>
  actor.authorize("mcp", "use");

/** @throws ForbiddenError when the actor cannot use the MCP server */
export const requireMcpAccess = (actor: Actor): void => {
  requirePermission(actor, "mcp", "use");
};
