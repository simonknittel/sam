import type { ApplicationContext } from "@sam-monorepo/application";

/** The page of the MCP app where the user manages the clients and their tools */
export const getSettingsPageUrl = (context: Pick<ApplicationContext, "urls">) =>
  new URL("/app/mcp", context.urls.baseUrl).href;
