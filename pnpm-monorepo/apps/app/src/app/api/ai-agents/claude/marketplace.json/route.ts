import { getApplicationContext } from "@/modules/application";
import { getClaudePluginArchiveUrl } from "@/modules/mcp-settings/utils/agentDistributionUrls";
import { createClaudeMarketplace } from "@sam-monorepo/mcp";

/**
 * The marketplace of the Claude plugin. Public by design: Claude Code loads
 * it without a login, and it has only the content of the public repository.
 * The file changes only with a release, thus the build makes it a static
 * file. It ignores the kill switch of the MCP server.
 */
export const dynamic = "force-static";

export const GET = () => {
  const context = getApplicationContext();

  return Response.json(
    createClaudeMarketplace(
      context,
      getClaudePluginArchiveUrl(context.urls.baseUrl),
    ),
  );
};
