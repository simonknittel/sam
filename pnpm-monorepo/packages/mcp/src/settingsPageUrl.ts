import type { ApplicationContext } from "@sam-monorepo/application";

/**
 * The page of the app "KI-Agenten" where the user connects clients and
 * manages them and their tools
 */
export const getSettingsPageUrl = (context: Pick<ApplicationContext, "urls">) =>
  new URL("/app/ai-agents", context.urls.baseUrl).href;
