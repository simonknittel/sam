import type { SkillFile } from "../../skillDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { formatToolNames } from "../formatToolNames.js";

export const fleetReference: SkillFile = {
  path: "references/fleet.md",
  description:
    "The fleet: the catalog of ship variants, the own ships of the members and the fleet of the organization.",
  content: `# Fleet (Flotte)

- **Catalog**: manufacturer (Hersteller), series (Serie) and variant (Variante). A variant is a ship model, for example "Cutlass Black". It has a flight readiness, tags (a key and a value, also a filter of the fleet lists), at most one link for each external website and optionally a wiki page that its variant page embeds. Members with \`manufacturersSeriesAndVariants;manage\` keep the catalog by hand. A delete in the catalog also deletes the ships of the deleted variants of all citizens.
- **Ship (Schiff)**: one copy of a variant that a citizen owns, optionally with a name. Each member keeps their own ships under "Meine Schiffe" (\`ship;manage\`).
- **Fleet of the organization (Organisation)**: the number of ships per variant of all citizens who are members of the organization in Spynet (\`orgFleet;read\`). "Änderungen" shows the ships that members added and removed (\`otherShips;read\`).
- A position of an event lineup can require ship variants.

Tools: ${formatToolNames(ToolGroup.Fleet)}.
`,
};
