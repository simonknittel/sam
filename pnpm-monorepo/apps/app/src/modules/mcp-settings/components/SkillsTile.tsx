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
  /** `npx skills add` finds the skills at this URL */
  readonly skillsUrl: string;
  readonly skillArchives: readonly SkillArchiveLink[];
}

export const SkillsTile = ({ className, skillsUrl, skillArchives }: Props) => {
  /** `agent` is a name of the agent list of `npx skills` */
  const getSkillsCommand = (agent: string) =>
    `npx skills add ${skillsUrl} -a ${agent} -g`;

  return (
    <Tile
      className={className}
      heading="Skills"
      childrenClassName="flex flex-col gap-6"
    >
      <div>
        <p>
          Die Skills erklären dem Modell die Apps und die Berechtigungen von
          SAM.
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

      <div className="grid gap-6 lg:grid-cols-2">
        <ClientSteps title="Claude.ai und Claude Desktop">
          <li>Lade die Skills herunter.</li>
          <li>
            Lade jede Datei unter &bdquo;Customize&ldquo; &rarr;
            &bdquo;Skills&ldquo; &rarr; &bdquo;Upload a skill&ldquo; hoch.
          </li>
        </ClientSteps>

        <ClientSteps title="Claude Code">
          <li>
            Installiere die Skills mit diesem Befehl:
            <CopyableCode value={getSkillsCommand("claude-code")} />
          </li>
        </ClientSteps>

        <ClientSteps title="Codex">
          <li>
            Installiere die Skills mit diesem Befehl:
            <CopyableCode value={getSkillsCommand("codex")} />
          </li>
        </ClientSteps>
      </div>
    </Tile>
  );
};
