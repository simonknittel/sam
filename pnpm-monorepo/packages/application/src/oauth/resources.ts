import { createActor, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { canUseMcp, requireMcpAccess } from "../mcpAccess.js";
import {
  canUseRemoteControlProgram,
  requireRemoteControlProgramUse,
} from "../remoteControlProgram/access/remoteControlProgramPermissions.js";
import { MCP_SCOPE, REMOTE_CONTROL_PROGRAM_SCOPE } from "./constants.js";
import { isDesktopCompanionClientId } from "./desktopCompanionClient.js";

type ResourceContext = Pick<ApplicationContext, "urls">;

/**
 * The protected resources of the authorization server (RFC 8707). Each
 * client has exactly one resource: the client id selects it. Thus the token
 * endpoint knows the resource before it reads a code or a refresh token.
 */
export enum OAuthResource {
  /** All clients except the desktop companion */
  Mcp = "mcp",
  /**
   * Only the desktop companion of SAM (decision 35 of the Remote Control
   * Program). Its access tokens give connection tokens for the runtime of
   * the citizen of the user.
   */
  RemoteControlProgram = "remote_control_program",
}

export const getOAuthResourceOfClient = (
  context: ResourceContext,
  clientId: string,
) =>
  isDesktopCompanionClientId(context, clientId)
    ? OAuthResource.RemoteControlProgram
    : OAuthResource.Mcp;

/** The audience of the access tokens of the resource */
export const getOAuthResourceUrl = (
  { urls }: ResourceContext,
  resource: OAuthResource,
) => {
  switch (resource) {
    case OAuthResource.Mcp:
      return urls.mcpResourceUrl;
    case OAuthResource.RemoteControlProgram:
      return urls.remoteControlProgramResourceUrl;
    default:
      throw new Error(`Unknown resource: ${resource satisfies never}`);
  }
};

/** The one scope that a grant of the resource gets */
export const getOAuthResourceScope = (resource: OAuthResource) => {
  switch (resource) {
    case OAuthResource.Mcp:
      return MCP_SCOPE;
    case OAuthResource.RemoteControlProgram:
      return REMOTE_CONTROL_PROGRAM_SCOPE;
    default:
      throw new Error(`Unknown resource: ${resource satisfies never}`);
  }
};

/**
 * The MCP SDK compares the resource of a token in the same way: without a
 * fragment and without one trailing slash
 */
const toComparableResource = (resource: string) =>
  resource.replace(/#.*$/, "").replace(/\/$/, "");

/**
 * Gives the resource of a `resource` parameter, or null for a different
 * value. A resource with a fragment is not valid (RFC 8707 section 2).
 */
export const findOAuthResource = (
  context: ResourceContext,
  resourceParameter: string,
): OAuthResource | null => {
  if (resourceParameter.includes("#")) return null;

  return (
    Object.values(OAuthResource).find(
      (resource) =>
        toComparableResource(resourceParameter) ===
        toComparableResource(getOAuthResourceUrl(context, resource).href),
    ) ?? null
  );
};

/**
 * The actor of the requests for the resource. The desktop companion never
 * has admin mode (decision 35 of the Remote Control Program): an admin needs
 * `remoteControlProgram;use`, also at the consent.
 */
export const toOAuthResourceActor = (
  actor: Actor,
  resource: OAuthResource,
): Actor => {
  switch (resource) {
    case OAuthResource.Mcp:
      return actor;
    case OAuthResource.RemoteControlProgram:
      return actor.adminMode
        ? createActor({ ...actor, adminMode: false })
        : actor;
    default:
      throw new Error(`Unknown resource: ${resource satisfies never}`);
  }
};

/**
 * The permission of the resource: `mcp;use`, or `remoteControlProgram;use`
 * with a citizen. It gates the consent page, the creation of a grant, the
 * token requests and each request with an access token. Give the actor of
 * `toOAuthResourceActor()`.
 */
export const canUseOAuthResource = (actor: Actor, resource: OAuthResource) => {
  switch (resource) {
    case OAuthResource.Mcp:
      return canUseMcp(actor);
    case OAuthResource.RemoteControlProgram:
      return canUseRemoteControlProgram(actor);
    default:
      throw new Error(`Unknown resource: ${resource satisfies never}`);
  }
};

/** @throws ForbiddenError when `canUseOAuthResource()` is false */
export const requireOAuthResourceUse = (
  actor: Actor,
  resource: OAuthResource,
) => {
  switch (resource) {
    case OAuthResource.Mcp:
      requireMcpAccess(actor);
      return;
    case OAuthResource.RemoteControlProgram:
      requireRemoteControlProgramUse(actor);
      return;
    default:
      throw new Error(`Unknown resource: ${resource satisfies never}`);
  }
};
