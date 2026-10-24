import { getApplicationContext } from "@/modules/application";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { isAdminModeActive } from "@/modules/auth/utils/isAdminModeActive";
import Note from "@/modules/common/components/Note";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { ConnectedClientsTile } from "@/modules/mcp-settings/components/ConnectedClientsTile";
import { McpConnectionTile } from "@/modules/mcp-settings/components/McpConnectionTile";
import { isMcpServerDisabled } from "@/modules/oauth/utils/isMcpServerDisabled";

/**
 * The page stays available while the kill switch is on: it only manages
 * the settings
 */
export default async function Page() {
  const { session, authorizePage } =
    await requireAuthenticationPage("/app/mcp");
  await authorizePage("mcp", "use");

  return (
    <div className="flex flex-col gap-4">
      {(await isMcpServerDisabled()) && (
        <Note
          type="warning"
          message="Der MCP-Server ist zurzeit abgeschaltet. Verbundene Clients können SAM nicht nutzen, und neue Clients können sich nicht verbinden. Deine Einstellungen bleiben erhalten."
        />
      )}

      <McpConnectionTile
        mcpUrl={getApplicationContext().urls.mcpResourceUrl.href}
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
