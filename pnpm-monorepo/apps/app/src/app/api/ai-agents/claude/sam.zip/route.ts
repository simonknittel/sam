import { getApplicationContext } from "@/modules/application";
import { archiveResponse } from "@/modules/mcp-settings/utils/archiveResponse";
import { buildClaudePluginArchive } from "@sam-monorepo/mcp";

/**
 * The archive of the Claude plugin, for the marketplace and for the upload in
 * Claude. Public and static like the marketplace.
 */
export const dynamic = "force-static";

export const GET = () =>
  archiveResponse(buildClaudePluginArchive(getApplicationContext()), "sam.zip");
