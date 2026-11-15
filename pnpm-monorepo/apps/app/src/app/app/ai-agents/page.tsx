import { getApplicationContext } from "@/modules/application";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { isAdminModeActive } from "@/modules/auth/utils/isAdminModeActive";
import Note from "@/modules/common/components/Note";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { ClaudePluginTile } from "@/modules/mcp-settings/components/ClaudePluginTile";
import { ConnectedClientsTile } from "@/modules/mcp-settings/components/ConnectedClientsTile";
import { ManualSetupTile } from "@/modules/mcp-settings/components/ManualSetupTile";
import {
  getClaudeMarketplaceUrl,
  getClaudePluginArchiveUrl,
  getSkillArchiveFileName,
  getSkillArchiveUrl,
} from "@/modules/mcp-settings/utils/agentFileUrls";
import { isMcpServerDisabled } from "@/modules/oauth/utils/isMcpServerDisabled";
import { listSkillNames } from "@sam-monorepo/mcp";

/**
 * The page stays available while the kill switch is on: it only manages
 * the settings
 */
export default async function Page() {
  const { session, authorizePage } =
    await requireAuthenticationPage("/app/ai-agents");
  await authorizePage("mcp", "use");

  const { baseUrl, mcpResourceUrl } = getApplicationContext().urls;

  return (
    <div className="flex flex-col gap-4">
      {(await isMcpServerDisabled()) && (
        <Note
          type="warning"
          message="Der MCP-Server ist zurzeit abgeschaltet. Verbundene Clients können SAM nicht nutzen, und neue Clients können sich nicht verbinden. Deine Einstellungen bleiben erhalten."
        />
      )}

      <ClaudePluginTile
        marketplaceUrl={getClaudeMarketplaceUrl(baseUrl).href}
        pluginArchiveUrl={getClaudePluginArchiveUrl(baseUrl).href}
      />

      <ManualSetupTile
        mcpUrl={mcpResourceUrl.href}
        skillsUrl={baseUrl.origin}
        skillArchives={listSkillNames().map((skillName) => ({
          fileName: getSkillArchiveFileName(skillName),
          url: getSkillArchiveUrl(baseUrl, skillName).href,
        }))}
      />

      <SuspenseWithErrorBoundaryTile>
        {/* The admin mode of a client is only managed while the admin mode
            of the toolbar is active, which is never the case while an admin
            assumes a user */}
        <ConnectedClientsTile
          canManageAdminMode={await isAdminModeActive(session)}
        />
      </SuspenseWithErrorBoundaryTile>
    </div>
  );
}
