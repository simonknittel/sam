import type { App } from "./types";

/**
 * Integrated and external apps have separate slug namespaces which can collide,
 * so a key is only unique together with its namespace.
 */
export enum AppKeyNamespace {
  Integrated = "integrated",
  External = "external",
}

/**
 * Stable identifier of an app, e.g. `integrated:dashboard`. Redacted apps carry
 * no slug and therefore no key, which is what keeps them out of the favorites
 * throughout the UI without any extra checks.
 */
export const getAppKey = (app: App): string | undefined => {
  if ("href" in app) return `${AppKeyNamespace.Integrated}:${app.slug}`;
  if ("defaultPage" in app) return `${AppKeyNamespace.External}:${app.slug}`;
  return undefined;
};

export const findAppByKey = (apps: App[] | null, appKey: string) =>
  apps?.find((app) => getAppKey(app) === appKey);
