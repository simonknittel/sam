import type { SkillFile } from "../../skillDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { formatToolNames } from "../formatToolNames.js";

export const fleetReference: SkillFile = {
  path: "references/fleet.md",
  description:
    "The fleet: the catalog of ship variants, the own ships of the members and the fleet of the organization.",
  content: `# Fleet (Flotte)

- **Catalog**: manufacturer (Hersteller), series (Serie) and variant (Variante). A variant is a ship model, for example "Cutlass Black". It has a flight readiness, a store price (USD) and an in-game price (aUEC), tags (a key and a value, also a filter of the fleet lists), at most one link for each external website and optionally a wiki page that its variant page embeds. Members with \`manufacturersSeriesAndVariants;manage\` keep the catalog by hand. A delete in the catalog also deletes the ships of the deleted variants of all citizens.
- **Ship (Schiff)**: one copy of a variant that a citizen owns, with an acquisition source (Herkunft) and optionally with a name and a note. Each member keeps their own ships under "Meine Schiffe" (\`ship;manage\`).
- **Fleet of the organization (Organisation)**: the number of ships per variant of all citizens who are members of the organization in Spynet and whose membership the user can see (\`orgFleet;read\` and \`organizationMembership;read\`). "Änderungen" shows the ships that all citizens added and removed (\`otherShips;read\`).
- A position of an event lineup can require ship variants.

Tools: ${formatToolNames(ToolGroup.Fleet)}.
`,
};
