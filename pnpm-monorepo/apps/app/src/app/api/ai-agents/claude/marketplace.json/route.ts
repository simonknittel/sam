import { getApplicationUrls } from "@/modules/application";
import { getClaudePluginArchiveUrl } from "@/modules/mcp-settings/utils/agentFileUrls";
import { createClaudeMarketplace } from "@sam-monorepo/mcp";

/**
 * The marketplace of the Claude plugin. Public and static, see
 * `docs/mcp-server.md#files-for-ai-agents`.
 */
export const dynamic = "force-static";

export const GET = () => {
  const urls = getApplicationUrls();

  return Response.json(
    createClaudeMarketplace({ urls }, getClaudePluginArchiveUrl(urls.baseUrl)),
  );
};
