import { prisma } from "@/db";
import { authenticate } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Flow, FlowRoleAccessType } from "@sam-monorepo/database/client";
import {
  resolveEffectiveRoles,
  resolveFlowPermissions,
  type FlowViewer,
  type ResolvedFlowPermissions,
} from "@sam-monorepo/permissions";
import { cache } from "react";

/**
 * Everything about a flow except its diagram: the nodes and edges are loaded
 * per flow by the page that renders one (see getFlowWithNodes).
 */
export type FlowContextFlow = Pick<
  Flow,
  | "id"
  | "name"
  | "slug"
  | "position"
  | "createdAt"
  | "createdById"
  | "updatedAt"
  | "updatedById"
  | "deletedAt"
  | "deletedById"
> & {
  roleAccess: { roleId: string; type: FlowRoleAccessType }[];
};

export interface FlowContext {
  viewer: FlowViewer;
  /** All flows, including soft-deleted ones, in display order */
  allFlows: FlowContextFlow[];
  /** Flows that are not soft-deleted, in display order */
  flows: FlowContextFlow[];
  flowsById: Map<string, FlowContextFlow>;
  /**
   * Only the non-deleted flows: a deleted flow releases its slug, so a slug
   * identifies at most one live flow but any number of deleted ones.
   */
  flowsBySlug: Map<string, FlowContextFlow>;
  /** Effective permissions of the current viewer for every flow */
  permissions: Map<string, ResolvedFlowPermissions>;
}

/**
 * Loads all career flows and resolves the current viewer's effective
 * permissions once per request. Everything career-related (navigation, the
 * flow page, the management UI, the entry points) derives from this context.
 * Returns null if the viewer is unauthenticated.
 */
export const getFlowContext = cache(
  withTrace("getFlowContext", async (): Promise<FlowContext | null> => {
    const authentication = await authenticate();
    if (!authentication) return null;

    /**
     * The admin escape hatch (user.role === "admin" + enable_admin cookie)
     * is part of authorize() and therefore flows into hasCareerManage, which
     * grants read and edit on every flow in the resolver.
     */
    const hasCareerManage = await authentication.authorize("career", "manage");

    const citizenId = authentication.session.entity?.id ?? null;

    const [roleAssignments, allFlows] = await Promise.all([
      citizenId
        ? prisma.roleAssignment.findMany({
            where: { citizenId },
            include: { role: { include: { inherits: true } } },
          })
        : Promise.resolve([]),
      prisma.flow.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          position: true,
          createdAt: true,
          createdById: true,
          updatedAt: true,
          updatedById: true,
          deletedAt: true,
          deletedById: true,
          roleAccess: { select: { roleId: true, type: true } },
        },
        orderBy: [{ position: "asc" }, { name: "asc" }],
      }),
    ]);

    /**
     * Same semantics as the session callback and `getWikiContext()` — all
     * three use `resolveEffectiveRoles()`: leveled roles only count once the
     * max level is reached, and inherited roles are included.
     */
    const roleIds = new Set(
      resolveEffectiveRoles(roleAssignments).map((role) => role.id),
    );

    const viewer: FlowViewer = { roleIds, hasCareerManage };

    const flows = allFlows.filter((flow) => flow.deletedAt === null);

    return {
      viewer,
      allFlows,
      flows,
      flowsById: new Map(allFlows.map((flow) => [flow.id, flow])),
      flowsBySlug: new Map(flows.map((flow) => [flow.slug, flow])),
      permissions: resolveFlowPermissions(allFlows, viewer),
    };
  }),
);
