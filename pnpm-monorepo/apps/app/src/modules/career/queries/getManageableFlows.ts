import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Prisma } from "@sam-monorepo/database/client";
import { cache } from "react";
import { FlowStatus } from "../utils/flowFilterParams";

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

/**
 * The flows of the management list, with everything its table shows. Carries
 * no permission check of its own — every caller is gated on `career;manage`,
 * which reads every flow.
 */
export const getManageableFlows = cache(
  withTrace(
    "getManageableFlows",
    async (status: FlowStatus, query: string | null) =>
      prisma.flow.findMany({
        where: {
          ...deletedAtFilter(status),
          ...(query
            ? {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { slug: { contains: query, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          position: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          createdBy: { select: { id: true, handle: true } },
          updatedBy: { select: { id: true, handle: true } },
          deletedBy: { select: { id: true, handle: true } },
          roleAccess: { select: { roleId: true, type: true } },
          _count: { select: { nodes: true } },
        },
        orderBy: [{ position: "asc" }, { name: "asc" }],
      }),
  ),
);

export type ManageableFlow = Awaited<
  ReturnType<typeof getManageableFlows>
>[number];
