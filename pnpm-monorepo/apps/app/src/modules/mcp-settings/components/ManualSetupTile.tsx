import { Tile } from "@/modules/common/components/Tile";
import { ClientSteps } from "./ClientSteps";
import { CopyableCode } from "./CopyableCode";
import { DownloadLink } from "./DownloadLink";

interface SkillArchiveLink {
  readonly fileName: string;
  readonly url: string;
}

interface Props {
  readonly className?: string;
  /** The canonical URL of the MCP endpoint */
  readonly mcpUrl: string;
  /** `npx skills add` finds the skills at this URL */
  readonly skillsUrl: string;
  readonly skillArchives: readonly SkillArchiveLink[];
}

export const ManualSetupTile = ({
  className,
  mcpUrl,
  skillsUrl,
  skillArchives,
}: Props) => {
  /** `agent` is a name of the agent list of `npx skills` */
  const getSkillsCommand = (agent: string) =>
    `npx skills add ${skillsUrl} -a ${agent} -g`;

  return (
    <Tile
      className={className}
      heading="Manuell: MCP-Server und Skills"
      childrenClassName="flex flex-col gap-6"
    >
      <div>
        <p>Das SAM stellt einen remote MCP Server zur Verfügung.</p>
        <p className="mt-4 text-sm text-neutral-500">URL</p>
        <CopyableCode value={mcpUrl} />
      </div>

      <div>
        <p>
          Die Skills erklären dem Modell die Apps und die Berechtigungen von
          SAM. Nur wenige Clients laden sie vom MCP-Server, deshalb installierst
          du sie zusätzlich.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {skillArchives.map((skillArchive) => (
            <li key={skillArchive.fileName}>
              <DownloadLink
                href={skillArchive.url}
                fileName={skillArchive.fileName}
              />
            </li>
          ))}
        </ul>
      </div>

      <details className="group">
        <summary className="cursor-pointer list-none rounded-secondary px-2 py-1 font-bold hover:bg-neutral-800 focus-visible:bg-neutral-800 focus-visible:outline-none active:bg-neutral-700">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90 motion-reduce:transition-none">
            &rsaquo;
          </span>
          Anleitung
        </summary>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <ClientSteps title="Claude.ai und Claude Desktop">
            <li>
              Öffne in Claude.ai &bdquo;Settings&ldquo; &rarr;
              &bdquo;Connectors&ldquo;.
            </li>
            <li>
              Wähle &bdquo;Add custom connector&ldquo; und gib einen Namen (zum
              Beispiel &bdquo;SAM&ldquo;) und die URL ein.
            </li>
            <li>Wähle &bdquo;Connect&ldquo; und erlaube den Zugriff in SAM.</li>
            <li>
              Lade die Skills herunter und lade jede Datei unter
              &bdquo;Customize&ldquo; &rarr; &bdquo;Skills&ldquo; &rarr;
              &bdquo;Upload a skill&ldquo; hoch.
            </li>
          </ClientSteps>

          <ClientSteps title="Claude Code">
            <li>
              Führe diesen Befehl aus:
              <CopyableCode
                value={`claude mcp add --transport http sam ${mcpUrl}`}
              />
            </li>
            <li>
              Gib in Claude Code &bdquo;/mcp&ldquo; ein, wähle &bdquo;sam&ldquo;
              und melde dich an.
            </li>
            <li>Erlaube den Zugriff in SAM.</li>
            <li>
              Installiere die Skills mit diesem Befehl:
              <CopyableCode value={getSkillsCommand("claude-code")} />
            </li>
          </ClientSteps>

          <ClientSteps title="ChatGPT">
            <li>
              Öffne in ChatGPT &bdquo;Settings&ldquo; &rarr;
              &bdquo;Connectors&ldquo; und schalte unter &bdquo;Advanced&ldquo;
              den &bdquo;Developer mode&ldquo; ein.
            </li>
            <li>
              Wähle &bdquo;Create&ldquo;, gib einen Namen (zum Beispiel
              &bdquo;SAM&ldquo;) und die URL ein und wähle als Authentifizierung
              &bdquo;OAuth&ldquo;.
            </li>
            <li>Wähle &bdquo;Create&ldquo; und erlaube den Zugriff in SAM.</li>
          </ClientSteps>

          <ClientSteps title="Codex">
            <li>
              Führe diesen Befehl aus:
              <CopyableCode value={`codex mcp add sam --url ${mcpUrl}`} />
            </li>
            <li>
              Melde dich mit diesem Befehl an:
              <CopyableCode value="codex mcp login sam" />
            </li>
            <li>Erlaube den Zugriff in SAM.</li>
            <li>
              Installiere die Skills mit diesem Befehl:
              <CopyableCode value={getSkillsCommand("codex")} />
            </li>
          </ClientSteps>
        </div>
      </details>
    </Tile>
  );
};
