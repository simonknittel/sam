import { getMcpApplicationContext } from "@/modules/application";
import { handleMcpRequest } from "@/modules/mcp/utils/handleMcpRequest";
import { withCorsHeaders } from "@/modules/mcp/utils/withCorsHeaders";
import { isMcpServerDisabled } from "@/modules/oauth/utils/isMcpServerDisabled";
import {
  corsPreflightResponse,
  temporarilyUnavailableResponse,
} from "@/modules/oauth/utils/responses";

export const POST = async (request: Request) => {
  if (await isMcpServerDisabled()) return temporarilyUnavailableResponse();

  return withCorsHeaders(
    await handleMcpRequest(getMcpApplicationContext(), request),
  );
};

export const OPTIONS = () =>
  corsPreflightResponse(
    "POST, OPTIONS",
    "Authorization, Content-Type, Accept, Mcp-Protocol-Version, Mcp-Method, Mcp-Name",
  );
