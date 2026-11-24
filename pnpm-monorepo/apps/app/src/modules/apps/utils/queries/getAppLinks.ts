import { getOptionalRequestActor } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { satisfiesAnyPermissionString } from "@sam-monorepo/application";
import { cache } from "react";
import { externalApps } from "../externalApps";
import { INTEGRATED_APPS } from "../INTEGRATED_APPS";
import type { App, RedactedApp } from "../types";

/**
 * Retrieves all apps from static configuration. Marks the integrated apps as
 * redacted when the user lacks the permissions to access them.
 */
export const getAppLinks = cache(
  withTrace("getAppLinks", async () => {
    const actor = await getOptionalRequestActor();
    if (!actor) return null;

    // TODO: Implement fetching apps from database

    const integratedApps = await Promise.all(
      INTEGRATED_APPS.map(async ({ hasAccess, ...app }) => {
        let redacted = !satisfiesAnyPermissionString(
          actor,
          app.permissionStrings,
        );

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
