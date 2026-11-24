import { getApplicationContext } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findWikiPermissionRoles } from "@sam-monorepo/application";
import { cache } from "react";

/**
 * Also the roles that the viewer cannot see. Never fill a role picker with it:
 * use `getVisibleRoles()`.
 */
export const getWikiPermissionRoles = cache(
  withTrace("getWikiPermissionRoles", () =>
    findWikiPermissionRoles(getApplicationContext()),
  ),
);
