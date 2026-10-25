import { TOOL_CATALOG } from "../catalog.js";
import type { ToolGroup } from "../toolGroup.js";

/** The names of the tools of a group as Markdown code, separated by commas */
export const formatToolNames = (group: ToolGroup) =>
  TOOL_CATALOG.filter((tool) => tool.group === group)
    .map((tool) => `\`${tool.name}\``)
    .join(", ");
