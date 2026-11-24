import type { Prisma } from "@sam-monorepo/database/client";
import { FLOW_NAME_MAXIMUM_LENGTH } from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";

/** The deleted filter is also the way to find a flow to restore */
export enum FlowStatus {
  Active = "active",
  Deleted = "deleted",
  All = "all",
}

const MANAGEABLE_FLOW_SELECT = {
  id: true,
  name: true,
  slug: true,
  position: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  createdBy: { select: CITIZEN_REFERENCE_SELECT },
  updatedBy: { select: CITIZEN_REFERENCE_SELECT },
  deletedBy: { select: CITIZEN_REFERENCE_SELECT },
  roleAccess: { select: { roleId: true, type: true } },
  _count: { select: { nodes: true } },
} as const satisfies Prisma.FlowSelect;

export type ManageableFlowRow = Prisma.FlowGetPayload<{
  select: typeof MANAGEABLE_FLOW_SELECT;
}>;

/**
 * A longer search text matches no name and no slug, thus the helper cuts the
 * search text of the URL to this length.
 */
const MAXIMUM_FLOW_QUERY_LENGTH = FLOW_NAME_MAXIMUM_LENGTH;

const deletedAtFilter = (status: FlowStatus): Prisma.FlowWhereInput => {
  switch (status) {
    case FlowStatus.Active:
      return { deletedAt: null };
    case FlowStatus.Deleted:
      return { deletedAt: { not: null } };
    case FlowStatus.All:
      return {};
    default:
      throw new Error(`Unexpected flow status: ${status satisfies never}`);
  }
};

export interface FindManageableFlowsInput {
  readonly status: FlowStatus;
  /** A part of the name or of the slug, or null for all flows */
  readonly query: string | null;
}

/**
 * `career;manage` grants read on each flow, thus the list has no filter by
 * role access
 */
export const findManageableFlows = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { status, query }: FindManageableFlowsInput,
): Promise<ManageableFlowRow[]> => {
  requirePermission(actor, "career", "manage");

  const searchText = query?.slice(0, MAXIMUM_FLOW_QUERY_LENGTH);

  return context.prisma.flow.findMany({
    where: {
      ...deletedAtFilter(status),
      ...(searchText
        ? {
            OR: [
              { name: { contains: searchText, mode: "insensitive" } },
              { slug: { contains: searchText, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: MANAGEABLE_FLOW_SELECT,
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
};

/** Also gives a deleted flow */
export const findManageableFlow = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { flowId }: { readonly flowId: string },
): Promise<ManageableFlowRow | null> => {
  requirePermission(actor, "career", "manage");

  return context.prisma.flow.findUnique({
    where: { id: flowId },
    select: MANAGEABLE_FLOW_SELECT,
  });
};
