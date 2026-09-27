import { authenticate, getEffectiveRoles } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { type EventTemplateViewer } from "@sam-monorepo/permissions";
import { cache } from "react";

/**
 * The current viewer as the template permission resolver needs them. Returns
 * null for an unauthenticated request, which no template surface serves.
 *
 * The admin escape hatch (user.role ADMIN + enable_admin cookie) is
 * part of authorize() and therefore flows into `hasEventManage`, which grants
 * every capability on every template in the resolver.
 */
export const getEventTemplateViewer = cache(
  withTrace(
    "getEventTemplateViewer",
    async (): Promise<EventTemplateViewer | null> => {
      const authentication = await authenticate();
      if (!authentication) return null;

      const citizenId = authentication.session.entity?.id ?? null;

      const [hasEventManage, hasTemplateShareManage, effectiveRoles] =
        await Promise.all([
          authentication.authorize("event", "manage"),
          authentication.authorize("eventTemplateShare", "manage"),
          citizenId ? getEffectiveRoles(citizenId) : null,
        ]);

      return {
        citizenId,
        roleIds: effectiveRoles?.roleIds ?? new Set(),
        hasEventManage,
        hasTemplateShareManage,
      };
    },
  ),
);
