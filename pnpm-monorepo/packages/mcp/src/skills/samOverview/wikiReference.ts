import type { SkillFile } from "../../skillDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { formatToolNames } from "../formatToolNames.js";

export const wikiReference: SkillFile = {
  path: "references/wiki.md",
  description:
    "The wiki: the tree of pages, the permissions per page, the owners, new pages and the trash.",
  content: `# Wiki

The wiki (\`/app/wiki\`) is a tree of pages. Several members can edit a page at the same time.

- **Permissions per page**: read (Lesen), edit (Bearbeiten) and manage (Manager). A page sets who can read it (Lesen: Geerbt, Öffentlich or Eingeschränkt to roles; Öffentlich only on a top-level page) and who can edit it (Bearbeiten). A page never gives more than its parent page. A member who manages a page also manages all its child pages.
- **Owner (Besitzer)**: the creator of a top-level page. The child pages get the owner of their parent.
- **New pages**: a new top-level page needs \`wiki;create\` and is private: only the owner and \`wiki;manage\` see it until the owner shares it. A new child page needs the manage permission of its parent page.
- **Trash (Papierkorb)**: a deleted page and its child pages stay in the trash for 30 days.
- **Briefings**: each event has its own pages, separate from the global wiki (see the events reference of this skill).
- \`wiki;manage\` reads, edits and manages all pages and changes the wiki settings.

Tools: ${formatToolNames(ToolGroup.Wiki)}.
`,
};
