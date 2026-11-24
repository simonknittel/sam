import type { ApplicationContext } from "../context.js";

/**
 * The MCP SDK compares the resource of a token in the same way: without a
 * fragment and without one trailing slash
 */
const toComparableResource = (resource: string) =>
  resource.replace(/#.*$/, "").replace(/\/$/, "");

/** A resource with a fragment is not valid (RFC 8707 section 2) */
export const isMcpResource = (
  context: Pick<ApplicationContext, "urls">,
  resource: string,
) =>
  !resource.includes("#") &&
  toComparableResource(resource) ===
    toComparableResource(context.urls.mcpResourceUrl.href);
