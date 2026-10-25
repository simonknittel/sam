import type { Actor } from "@sam-monorepo/application";
import {
  ToolKind,
  type CatalogTool,
  type ToolCatalogEntry,
} from "./toolDefinition.js";
import { TOOL_GROUP_ORDER, TOOL_GROUP_TITLES, ToolGroup } from "./toolGroup.js";
import { getCurrentUserTool } from "./tools/account/getCurrentUser.js";
import { changelogTools } from "./tools/changelog/index.js";
import { eventsTools } from "./tools/events/index.js";
import { fleetTools } from "./tools/fleet/index.js";
import { lineupTools } from "./tools/lineup/index.js";
import { manualNotificationTools } from "./tools/manualNotifications/index.js";
import { penaltyPointsTools } from "./tools/penaltyPoints/index.js";
import { rolesTools } from "./tools/roles/index.js";
import { spynetTools } from "./tools/spynet/index.js";
import { systemLogTools } from "./tools/systemLog/index.js";
import { tasksTools } from "./tools/tasks/index.js";
import { wikiTools } from "./tools/wiki/index.js";

const compareTools = (first: CatalogTool, second: CatalogTool) =>
  TOOL_GROUP_ORDER.indexOf(first.group) -
    TOOL_GROUP_ORDER.indexOf(second.group) ||
  first.name.localeCompare(second.name, "en");

/** All tools, sorted by the order of the groups and then by the name */
export const TOOL_CATALOG: readonly CatalogTool[] = [
  getCurrentUserTool,
  ...spynetTools,
  ...rolesTools,
  ...penaltyPointsTools,
  ...fleetTools,
  ...wikiTools,
  ...eventsTools,
  ...lineupTools,
  ...tasksTools,
  ...manualNotificationTools,
  ...changelogTools,
  ...systemLogTools,
].sort(compareTools);

export const toToolCatalogEntry = (tool: CatalogTool): ToolCatalogEntry => ({
  name: tool.name,
  group: tool.group,
  title: tool.title,
  description: tool.description,
  kind: tool.annotations.readOnlyHint ? ToolKind.Read : ToolKind.Write,
});

/** All tools in the order of `tools/list` */
export const listToolCatalog = (): ToolCatalogEntry[] =>
  TOOL_CATALOG.map(toToolCatalogEntry);

/** The tools of one group of the catalog */
export interface ToolCatalogGroup {
  readonly group: ToolGroup;
  readonly title: string;
  readonly tools: ToolCatalogEntry[];
}

/**
 * The groups of the catalog with the tools that are visible for the actor, in
 * the order of `tools/list`. The MCP app and the consent page show them.
 */
export const listToolCatalogGroups = (actor: Actor): ToolCatalogGroup[] => {
  const catalog = TOOL_CATALOG.filter((tool) => tool.isVisible(actor)).map(
    toToolCatalogEntry,
  );

  return TOOL_GROUP_ORDER.map((group) => ({
    group,
    title: TOOL_GROUP_TITLES[group],
    tools: catalog.filter((tool) => tool.group === group),
  })).filter((group) => group.tools.length > 0);
};

const TOOL_NAMES: ReadonlySet<string> = new Set(
  TOOL_CATALOG.map((tool) => tool.name),
);

/**
 * Whether the catalog has a tool of this name. The application package
 * cannot check the names of the tool settings, because the catalog is in
 * this package. Thus the host checks them with this function.
 */
export const isCatalogToolName = (toolName: string) => TOOL_NAMES.has(toolName);
