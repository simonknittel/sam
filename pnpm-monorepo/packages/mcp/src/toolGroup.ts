/**
 * The areas of the app that the tools belong to. The order of the members is
 * the order of the groups in `tools/list` and in the MCP app.
 */
export enum ToolGroup {
  Account = "account",
  Notifications = "notifications",
  Spynet = "spynet",
  Roles = "roles",
  PenaltyPoints = "penalty_points",
  Fleet = "fleet",
  Wiki = "wiki",
  Events = "events",
  Lineup = "lineup",
  Tasks = "tasks",
  ManualNotifications = "manual_notifications",
  Changelog = "changelog",
  SystemLog = "system_log",
}

export const TOOL_GROUP_TITLES: Readonly<Record<ToolGroup, string>> = {
  [ToolGroup.Account]: "Account",
  [ToolGroup.Notifications]: "Notifications",
  [ToolGroup.Spynet]: "Spynet",
  [ToolGroup.Roles]: "Roles",
  [ToolGroup.PenaltyPoints]: "Penalty points",
  [ToolGroup.Fleet]: "Fleet",
  [ToolGroup.Wiki]: "Wiki",
  [ToolGroup.Events]: "Events",
  [ToolGroup.Lineup]: "Lineup",
  [ToolGroup.Tasks]: "Tasks",
  [ToolGroup.ManualNotifications]: "Manual notifications",
  [ToolGroup.Changelog]: "Changelog",
  [ToolGroup.SystemLog]: "System log",
};

export const TOOL_GROUP_ORDER: readonly ToolGroup[] = Object.values(ToolGroup);
