import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

/**
 * The diagram of one flow. Deliberately not part of the flow context, which
 * every career page loads: only the page rendering a flow needs its nodes and
 * edges. Carries no permission check — the caller resolves access through the
 * context first.
 */
export const getFlowWithNodes = cache(
  withTrace("getFlowWithNodes", async (flowId: string) =>
    prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        nodes: {
          include: {
            sources: true,
            targets: true,
          },
        },
      },
    }),
  ),
);
