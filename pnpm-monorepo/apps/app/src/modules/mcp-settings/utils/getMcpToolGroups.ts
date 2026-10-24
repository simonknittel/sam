import {
  listToolCatalog,
  TOOL_GROUP_TITLES,
  ToolGroup,
  type ToolCatalogEntry,
} from "@sam-monorepo/mcp";

export interface McpToolGroup {
  readonly group: ToolGroup;
  readonly title: string;
  readonly tools: ToolCatalogEntry[];
}

/** All tools of the catalog, grouped in the order of `tools/list` */
export const getMcpToolGroups = (): McpToolGroup[] => {
  const catalog = listToolCatalog();

  return Object.values(ToolGroup)
    .map((group) => ({
      group,
      title: TOOL_GROUP_TITLES[group],
      tools: catalog.filter((tool) => tool.group === group),
    }))
    .filter((group) => group.tools.length > 0);
};
