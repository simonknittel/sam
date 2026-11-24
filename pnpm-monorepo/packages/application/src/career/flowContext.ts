import type { Prisma } from "@sam-monorepo/database/client";
import {
  createFlowPermissionResolver,
  resolveFlowPermissions,
  type FlowPermissionSource,
  type FlowViewer,
  type ResolvedFlowPermissions,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";

/**
 * The id of a flow: a cuid2, but some flows of the production database have a
 * UUID
 */
export const flowIdSchema = z.union([idSchema, z.uuid()]);

const FLOW_CONTEXT_SELECT = {
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
} as const satisfies Prisma.FlowSelect;

export type FlowContextFlow = Prisma.FlowGetPayload<{
  select: typeof FLOW_CONTEXT_SELECT;
}>;

export interface FlowContext {
  /** The flows that are not soft-deleted, in display order */
  flows: FlowContextFlow[];
  /**
   * Only the flows that are not deleted: a deleted flow releases its slug,
   * thus a slug identifies at most one live flow but any number of deleted
   * ones.
   */
  flowsBySlug: Map<string, FlowContextFlow>;
  permissions: Map<string, ResolvedFlowPermissions>;
}

const toFlowViewer = (actor: Actor): FlowViewer => ({
  roleIds: actor.roleIds,
  hasCareerManage: actor.authorize("career", "manage"),
});

export const resolveFlowPermissionsOfActor = (
  actor: Actor,
  flow: FlowPermissionSource,
) => createFlowPermissionResolver([flow], toFlowViewer(actor)).get(flow.id);

/**
 * No permission check: gives all flows with the effective permissions of the
 * actor. The management pages have their own reads (see
 * `findManageableFlows()`).
 */
export const loadFlowContext = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<FlowContext> => {
  const allFlows = await context.prisma.flow.findMany({
    select: FLOW_CONTEXT_SELECT,
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  const flows = allFlows.filter((flow) => flow.deletedAt === null);

  return {
    flows,
    flowsBySlug: new Map(flows.map((flow) => [flow.slug, flow])),
    permissions: resolveFlowPermissions(allFlows, toFlowViewer(actor)),
  };
};

export const listReadableFlows = (
  flowContext: FlowContext,
): FlowContextFlow[] =>
  flowContext.flows.filter(
    (flow) => flowContext.permissions.get(flow.id)?.canRead,
  );
