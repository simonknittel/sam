import { TOOL_CATALOG } from "../catalog.js";
import type { ToolGroup } from "../toolGroup.js";

export const formatToolNames = (group: ToolGroup) =>
  TOOL_CATALOG.filter((tool) => tool.group === group)
    .map((tool) => `\`${tool.name}\``)
    .join(", ");
