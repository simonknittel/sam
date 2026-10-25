import {
  PERMISSION_CATALOG,
  type CatalogPermission,
} from "@sam-monorepo/domain";
import type { SkillFile } from "../../skillDefinition.js";

const formatPermission = ({
  permissionString,
  title,
  description,
}: CatalogPermission) =>
  `- \`${permissionString}\`: ${title}${description ? ` — ${description}` : ""}`;

const formatSection = (
  section: string,
  permissions: readonly CatalogPermission[],
) => `## ${section}\n\n${permissions.map(formatPermission).join("\n")}\n`;

const sections = Map.groupBy<string, CatalogPermission>(
  PERMISSION_CATALOG,
  (permission) => permission.section,
);

/** Made from the catalog of the role page, thus it is always current */
export const catalogReference: SkillFile = {
  path: "references/catalog.md",
  description:
    "All permission strings of the role page of SAM by section, with their German titles and descriptions.",
  content: `# Permission catalog

The permissions that the role page offers as a checkbox, in the sections of the role page. The titles and the descriptions are the German texts of the role page. The rules for other roles and for notes are not in this list (see SKILL.md).

${Array.from(sections, ([section, permissions]) => formatSection(section, permissions)).join("\n")}`,
};
