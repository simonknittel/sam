import { authenticate } from "@/modules/auth/server";
import { transformPermissionStringToPermissionSet } from "@/modules/auth/transformPermissionStringToPermissionSet";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { externalApps } from "./externalApps";
import { INTEGRATED_APPS } from "./INTEGRATED_APPS";
import type { App, RedactedApp } from "./types";

/**
 * Retrieves all apps from static configuration and database. Then marks apps
 * as redacted when the user lacks the permissions to access them.
 */
export const getAppLinks = cache(
  withTrace("getAppLinks", async () => {
    const authentication = await authenticate();
    if (!authentication) return null;

    // TODO: Implement fetching apps from database

    const apps: App[] = await Promise.all([
      ...INTEGRATED_APPS.map(async (app) => {
        let redacted = false;

        if (app.permissionStrings && app.permissionStrings.length > 0) {
          const permissions = await Promise.all(
            app.permissionStrings.map(async (permissionString) => {
              const permissionSet =
                transformPermissionStringToPermissionSet(permissionString);

              return authentication.authorize(
                permissionSet.resource,
                permissionSet.operation,
                permissionSet.attributes,
              );
            }),
          );

          if (!permissions.some((permission) => permission === true))
            redacted = true;
        }

        if (redacted) {
          return {
            name: app.name,
            tags: app.tags,
            redacted: true,
          } satisfies RedactedApp;
        }

        return {
          ...app,
        };
      }),

      // TODO: Implement permission check
      // eslint-disable-next-line @typescript-eslint/await-thenable
      ...externalApps.map((externalApp) => {
        return {
          ...externalApp,
        };
      }),
    ]);

    return apps;
  }),
);

export const getExternalAppBySlug = cache(
  withTrace("getExternalApp", async (slug: string) => {
    const authentication = await authenticate();
    if (!authentication) return null;

    // TODO: Implement fetching apps from database

    const app = externalApps.find((app) => app.slug === slug);
    if (!app) return null;

    return app;
  }),
);
