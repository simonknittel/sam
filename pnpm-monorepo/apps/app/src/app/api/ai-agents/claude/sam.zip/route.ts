import { getApplicationUrls } from "@/modules/application";
import { CLAUDE_PLUGIN_ARCHIVE_FILE_NAME } from "@/modules/mcp-settings/utils/agentFileUrls";
import { archiveResponse } from "@/modules/mcp-settings/utils/archiveResponse";
import { createClaudePluginArchive } from "@sam-monorepo/mcp";

/**
 * The archive of the Claude plugin, for the marketplace and for the upload in
 * Claude. Public and static, see `docs/mcp-server.md#files-for-ai-agents`.
 */
export const dynamic = "force-static";

export const GET = () =>
  archiveResponse(
    createClaudePluginArchive({ urls: getApplicationUrls() }),
    CLAUDE_PLUGIN_ARCHIVE_FILE_NAME,
  );
