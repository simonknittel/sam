import type { SkillFile } from "../../skillDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { formatToolNames } from "../formatToolNames.js";

export const spynetReference: SkillFile = {
  path: "references/spynet.md",
  description:
    "Spynet, the intelligence database: citizens with their confirmed identity data, notes with note types and classification levels, organizations and memberships.",
  content: `# Spynet

Spynet (\`/app/spynet\`) is the intelligence database of the organization: citizens (Star Citizen players, members or not), organizations and notes about citizens.

- **Identity data**: handle, community moniker, citizen ID, Discord ID and TeamSpeak ID. Each value is a report with a state: unconfirmed (Unbestätigt), confirmed (Bestätigt) or false report (Falschmeldung). The citizen shows the latest confirmed value of each kind. A handle can change, the Spectrum ID stays.
- **Notes (Notizen)**: each note has a note type (Notizart) and a classification level (Geheimhaltungsstufe). The note rules of the roles decide who can read, write and confirm the notes of a type and a level (see the skill sam-permissions). With "readRedacted", the user sees only that a note exists. A note that is not confirmed needs a rule with \`alsoUnconfirmed=true\`.
- **Organizations**: Star Citizen organizations with their members. A membership is main (MAIN) or affiliate (AFFILIATE), and visible or redacted. A new membership is unconfirmed until somebody confirms it.
- **Citizen page**: the tabs show the overview, the notes, the organizations, the roles, the fleet, the SILC and the penalty points of the citizen.

Tools: ${formatToolNames(ToolGroup.Spynet)}.
`,
};
