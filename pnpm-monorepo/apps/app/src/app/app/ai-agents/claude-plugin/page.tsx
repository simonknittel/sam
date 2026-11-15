import { getApplicationContext } from "@/modules/application";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { ClaudePluginTile } from "@/modules/mcp-settings/components/ClaudePluginTile";
import { McpServerDisabledNote } from "@/modules/mcp-settings/components/McpServerDisabledNote";
import {
  getClaudeMarketplaceUrl,
  getClaudePluginArchiveUrl,
} from "@/modules/mcp-settings/utils/agentFileUrls";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plugin für Claude",
};

export default async function Page() {
  const { authorizePage } = await requireAuthenticationPage(
    "/app/ai-agents/claude-plugin",
  );
  await authorizePage("mcp", "use");

  const { baseUrl } = getApplicationContext().urls;

  return (
    <div className="flex flex-col gap-4">
      <McpServerDisabledNote />
      <ClaudePluginTile
        marketplaceUrl={getClaudeMarketplaceUrl(baseUrl).href}
        pluginArchiveUrl={getClaudePluginArchiveUrl(baseUrl).href}
      />
    </div>
  );
}
