import { AppKeyNamespace } from "@sam-monorepo/domain";
import type { App } from "./types";

/**
 * For example `integrated:dashboard`. Redacted apps carry no slug and therefore
 * no key, which is what keeps them out of the favorites.
 */
export const getAppKey = (app: App): string | undefined => {
  if ("href" in app) return `${AppKeyNamespace.Integrated}:${app.slug}`;
  if ("defaultPage" in app) return `${AppKeyNamespace.External}:${app.slug}`;
  return undefined;
};
