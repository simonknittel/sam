import type { ApplicationContext } from "@sam-monorepo/application";

type UrlContext = Pick<ApplicationContext, "urls">;

export const getAiAgentsAppUrl = (context: UrlContext) =>
  new URL("/app/ai-agents", context.urls.baseUrl).href;

export const getSettingsPageUrl = (context: UrlContext) =>
  new URL("/app/ai-agents/clients", context.urls.baseUrl).href;
