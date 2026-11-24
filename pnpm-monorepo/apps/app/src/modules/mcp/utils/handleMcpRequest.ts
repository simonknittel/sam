import "server-only";

import { env } from "@/env";
import { log } from "@/modules/logging";
import { createMcpRequestHandler } from "@sam-monorepo/mcp";

export const handleMcpRequest = createMcpRequestHandler({
  serverVersion: String(env.NEXT_PUBLIC_RELEASE_NUMBER ?? "development"),
  onerror: (error) => {
    // The SDK also calls it for each request that it refuses, for example a
    // request of the legacy `initialize` handshake. Thus a warning, and only
    // the message: the error can contain data of the request.
    log.warn("The MCP handler refused a request or failed", {
      reason: error.message,
    });
  },
});
