import "server-only";

import { getApplicationContext } from "@/modules/application";
import {
  getOAuthResourceOfClient,
  OAuthResource,
} from "@sam-monorepo/application";
import { isMcpServerDisabled } from "./isMcpServerDisabled";

/**
 * The kill switch of each resource: `DisableMcpServer` for the MCP server,
 * `DisableRemoteControlProgram` for the Remote Control Program (see
 * docs/mcp-server.md)
 */
export const isOAuthResourceTurnedOff = (resource: OAuthResource) => {
  switch (resource) {
    case OAuthResource.Mcp:
      return isMcpServerDisabled();
    case OAuthResource.RemoteControlProgram:
      return getApplicationContext().isRemoteControlProgramTurnedOff();
    default:
      throw new Error(`Unknown resource: ${resource satisfies never}`);
  }
};

/**
 * The client id selects the resource. A request without a client id is not
 * valid: it gets the answers of the MCP server.
 */
export const getOAuthResourceOfClientParameter = (clientId: unknown) =>
  typeof clientId === "string"
    ? getOAuthResourceOfClient(getApplicationContext(), clientId)
    : OAuthResource.Mcp;

/**
 * The endpoints of both resources (the metadata of the authorization server
 * and the revocation) stop only when both kill switches are on
 */
export const areAllOAuthResourcesTurnedOff = async () =>
  (
    await Promise.all(
      Object.values(OAuthResource).map(isOAuthResourceTurnedOff),
    )
  ).every(Boolean);
