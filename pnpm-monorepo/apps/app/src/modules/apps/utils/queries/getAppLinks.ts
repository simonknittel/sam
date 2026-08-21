import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { transformPermissionStringToPermissionSet } from "@sam-monorepo/permissions";
import { cache } from "react";
import { externalApps } from "../externalApps";
import { INTEGRATED_APPS } from "../INTEGRATED_APPS";
import type { App, RedactedApp } from "../types";

/**
 * Retrieves all apps from static configuration and database. Then marks apps
 * as redacted when the user lacks the permissions to access them.
 */
export const getAppLinks = cache(
  withTrace("getAppLinks", async () => {
    const authentication = await authenticate();
    if (!authentication) return null;

    // TODO: Implement fetching apps from database

    const integratedApps = await Promise.all(
      INTEGRATED_APPS.map(async ({ hasAccess, ...app }) => {
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

        /**
         * The callback is stripped above so it never reaches a client
         * component — functions cannot cross that boundary.
         */
        if (!redacted && hasAccess && !(await hasAccess())) redacted = true;

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
    );

    // TODO: Implement permission check
    const apps: App[] = [...integratedApps, ...externalApps];

    return apps;
  }),
);
