import { Note } from "@/modules/common/components/Note";
import { Tile } from "@/modules/common/components/Tile";
import { CLAUDE_PLUGIN_ARCHIVE_FILE_NAME } from "@/modules/mcp-settings/utils/agentFileUrls";
import {
  CLAUDE_MARKETPLACE_NAME,
  CLAUDE_PLUGIN_ID,
  CLAUDE_PLUGIN_MCP_SERVER_LABEL,
} from "@sam-monorepo/mcp";
import { ClientSteps } from "./ClientSteps";
import { CopyableCode } from "./CopyableCode";
import { DownloadLink } from "./DownloadLink";

interface Props {
  readonly className?: string;
  readonly marketplaceUrl: string;
  readonly pluginArchiveUrl: string;
}

export const ClaudePluginTile = ({
  className,
  marketplaceUrl,
  pluginArchiveUrl,
}: Props) => {
  return (
    <Tile
      className={className}
      heading="Plugin für Claude"
      childrenClassName="flex flex-col gap-6"
    >
      <p>
        Das Plugin enthält den MCP-Server und die Skills von SAM. Damit
        verbindest du Claude Code, Claude Desktop oder Claude.ai in einem
        Schritt.
      </p>

      <Note
        type="warning"
        message="Entferne zuerst jede manuelle Verbindung mit SAM, auch einen eigenen Connector in Claude.ai: Claude Code zeigt auch die Connectors aus Claude.ai. Sonst sind alle Tools doppelt vorhanden."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ClientSteps
          title="Claude Code"
          note={
            <>
              Claude Code aktualisiert das Plugin nicht von selbst. Schalte
              unter &bdquo;/plugin&ldquo; &rarr; &bdquo;Marketplaces&ldquo; die
              automatischen Updates ein, oder führe &bdquo;claude plugin
              marketplace update {CLAUDE_MARKETPLACE_NAME}&ldquo; und dann
              &bdquo;claude plugin update {CLAUDE_PLUGIN_ID}&ldquo; aus.
            </>
          }
        >
          <li>
            Füge den Marketplace von SAM hinzu:
            <CopyableCode
              value={`claude plugin marketplace add ${marketplaceUrl}`}
            />
          </li>
          <li>
            Installiere das Plugin:
            <CopyableCode value={`claude plugin install ${CLAUDE_PLUGIN_ID}`} />
          </li>
          <li>
            Gib in Claude Code &bdquo;/mcp&ldquo; ein, wähle &bdquo;
            {CLAUDE_PLUGIN_MCP_SERVER_LABEL}&ldquo; und melde dich an.
          </li>
          <li>Erlaube den Zugriff in SAM.</li>
        </ClientSteps>

        <ClientSteps
          title="Claude Desktop und Claude.ai"
          note="Ein hochgeladenes Plugin aktualisiert sich nicht von selbst."
        >
          <li className="flex flex-col gap-1">
            Lade das Plugin herunter:
            <DownloadLink
              href={pluginArchiveUrl}
              fileName={CLAUDE_PLUGIN_ARCHIVE_FILE_NAME}
            />
          </li>
          <li>
            Öffne in Claude &bdquo;Customize&ldquo; &rarr;
            &bdquo;Plugins&ldquo;, wähle &bdquo;Add&ldquo; &rarr; &bdquo;Upload
            plugin&ldquo; und wähle die Datei.
          </li>
          <li>
            Verbinde den Connector des Plugins und erlaube den Zugriff in SAM.
          </li>
        </ClientSteps>
      </div>
    </Tile>
  );
};
