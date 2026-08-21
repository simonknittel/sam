import { FlowRoleAccessType } from "@sam-monorepo/database/browser";

export interface FlowPermissionSource {
  readonly id: string;
  /** Soft-deleted flows grant nothing to anyone (see the grant rules below) */
  readonly deletedAt: Date | null;
  readonly roleAccess: readonly {
    readonly roleId: string;
    readonly type: FlowRoleAccessType;
  }[];
}

export interface FlowViewer {
  readonly roleIds: ReadonlySet<string>;
  readonly hasCareerManage: boolean;
}

export interface ResolvedFlowPermissions {
  readonly canRead: boolean;
  readonly canUpdate: boolean;
}

const NO_ACCESS: ResolvedFlowPermissions = {
  canRead: false,
  canUpdate: false,
};

/**
 * Resolves one viewer's access to a set of career flows.
 *
 * Grant rules:
 * - A soft-deleted flow grants nothing, not even to `career;manage` holders.
 *   Managing a deleted flow (restoring or destroying it) is a management
 *   operation gated on the permission itself, not on read access.
 * - `career;manage` grants read and edit on every live flow, on top of the
 *   flow management the permission is really about.
 * - Otherwise access comes from the flow's role-access rows: a tier of UPDATE
 *   grants edit, a tier of READ grants read only.
 * - Edit implies read, so a role granted UPDATE never needs a second row.
 */
export const createFlowPermissionResolver = (
  flows: readonly FlowPermissionSource[],
  viewer: FlowViewer,
) => {
  const flowsById = new Map(flows.map((flow) => [flow.id, flow]));

  const get = (flowId: string): ResolvedFlowPermissions | undefined => {
    const flow = flowsById.get(flowId);
    if (!flow) return undefined;
    if (flow.deletedAt !== null) return NO_ACCESS;
    if (viewer.hasCareerManage) return { canRead: true, canUpdate: true };

    const grantedTypes = flow.roleAccess
      .filter((access) => viewer.roleIds.has(access.roleId))
      .map((access) => access.type);

    const canUpdate = grantedTypes.includes(FlowRoleAccessType.UPDATE);

    return {
      canUpdate,
      canRead: canUpdate || grantedTypes.includes(FlowRoleAccessType.READ),
    };
  };

  return { get };
};

/**
 * Resolves the effective permissions of the given viewer for every given
 * flow — see `createFlowPermissionResolver()` for the grant rules.
 */
export const resolveFlowPermissions = (
  flows: readonly FlowPermissionSource[],
  viewer: FlowViewer,
) => {
  const resolver = createFlowPermissionResolver(flows, viewer);

  const result = new Map<string, ResolvedFlowPermissions>();
  for (const flow of flows) {
    const permissions = resolver.get(flow.id);
    if (permissions) result.set(flow.id, permissions);
  }

  return result;
};
