import { getApplicationContext } from "@/modules/application";
import { isMcpServerDisabled } from "@/modules/oauth/utils/isMcpServerDisabled";
import {
  corsPreflightResponse,
  temporarilyUnavailableResponse,
  tokenEndpointResponse,
} from "@/modules/oauth/utils/responses";
import {
  parseTokenEndpointInput,
  readTokenEndpointForm,
  toTokenEndpointErrorResponse,
} from "@/modules/oauth/utils/tokenEndpoint";
import { revokeToken, revokeTokenInputSchema } from "@sam-monorepo/application";

/**
 * The revocation endpoint of the MCP OAuth server (RFC 7009). It answers
 * `200` also for an unknown token. Public by design: the clients are public
 * clients, and the possession of a token is the proof. A revocation can only
 * remove access.
 */
export const POST = async (request: Request) => {
  if (await isMcpServerDisabled()) return temporarilyUnavailableResponse();

  try {
    await revokeToken(
      getApplicationContext(),
      parseTokenEndpointInput(
        revokeTokenInputSchema,
        await readTokenEndpointForm(request),
      ),
    );

    return tokenEndpointResponse(null);
  } catch (error) {
    return toTokenEndpointErrorResponse(error, "revoke");
  }
};

/** Browser-based clients call the endpoint from a different origin */
export const OPTIONS = () =>
  corsPreflightResponse("POST, OPTIONS", "Content-Type");
