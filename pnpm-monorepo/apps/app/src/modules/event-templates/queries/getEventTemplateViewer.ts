import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  resolveEffectiveRoles,
  type EventTemplateViewer,
} from "@sam-monorepo/permissions";
import { cache } from "react";

/**
 * The current viewer as the template permission resolver needs them. Returns
 * null for an unauthenticated request, which no template surface serves.
 *
 * The admin escape hatch (user.role === "admin" + enable_admin cookie) is
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

      const [hasEventManage, hasTemplateShareManage, roleAssignments] =
        await Promise.all([
          authentication.authorize("event", "manage"),
          authentication.authorize("eventTemplateShare", "manage"),
          citizenId
            ? prisma.roleAssignment.findMany({
                where: { citizenId },
                include: { role: { include: { inherits: true } } },
              })
            : Promise.resolve([]),
        ]);

      /**
       * Same semantics as the session callback, `getWikiContext()` and
       * `getFlowContext()`: leveled roles only count once the max level is
       * reached, and inherited roles are included.
       */
      const roleIds = new Set(
        resolveEffectiveRoles(roleAssignments).map((role) => role.id),
      );

      return { citizenId, roleIds, hasEventManage, hasTemplateShareManage };
    },
  ),
);
