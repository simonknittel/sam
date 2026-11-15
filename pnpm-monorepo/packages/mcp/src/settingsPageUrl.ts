import type { ApplicationContext } from "@sam-monorepo/application";

type UrlContext = Pick<ApplicationContext, "urls">;

/** The overview page of the app "KI-Agenten" */
export const getAiAgentsAppUrl = (context: UrlContext) =>
  new URL("/app/ai-agents", context.urls.baseUrl).href;

/**
 * The page of the app "KI-Agenten" where the user manages the connected
 * clients and their tools
 */
export const getSettingsPageUrl = (context: UrlContext) =>
  new URL("/app/ai-agents/clients", context.urls.baseUrl).href;
