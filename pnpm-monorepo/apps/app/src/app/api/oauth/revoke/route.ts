import { getApplicationContext } from "@/modules/application";
import { areAllOAuthResourcesTurnedOff } from "@/modules/oauth/utils/isOAuthResourceTurnedOff";
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
 * RFC 7009: `200` also for an unknown token. Public by design: the clients are
 * public clients, and the possession of a token is the proof. A revocation can
 * only remove access, thus it stops only with both kill switches.
 */
export const POST = async (request: Request) => {
  if (await areAllOAuthResourcesTurnedOff())
    return temporarilyUnavailableResponse();

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

export const OPTIONS = () =>
  corsPreflightResponse("POST, OPTIONS", "Content-Type");
