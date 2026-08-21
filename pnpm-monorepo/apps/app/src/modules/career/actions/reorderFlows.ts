"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  // Arbitrary (untested) limit to prevent DDoS
  flowIds: z.array(z.string()).min(1).max(250),
});

export const reorderFlows = createAuthenticatedAction(
  "reorderFlows",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("career", "manage")))
      return { error: t("Common.forbidden"), requestPayload: formData };

    const flows = await prisma.flow.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    /**
     * The payload has to be a permutation of exactly the live flows.
     * Anything else — a stale list from a concurrent create or delete, a
     * duplicate id — would leave the order half-applied.
     */
    const givenIds = new Set(data.flowIds);
    const isPermutation =
      givenIds.size === data.flowIds.length &&
      givenIds.size === flows.length &&
      flows.every((flow) => givenIds.has(flow.id));
    if (!isPermutation)
      return {
        error:
          "Die Reihenfolge ist veraltet. Bitte lade die Seite neu und versuche es erneut.",
        requestPayload: formData,
      };

    /**
     * Positions are not unique, so the whole list can be renumbered in one
     * transaction without placeholder values.
     */
    await prisma.$transaction(
      data.flowIds.map((flowId, index) =>
        prisma.flow.update({
          where: { id: flowId },
          data: { position: index },
        }),
      ),
    );

    await createAuditEvents([
      {
        type: AuditEventType.CAREER_FLOWS_REORDERED,
        data: {
          flowIds: data.flowIds,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/career", "layout");

    return {
      success: t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      flowIds: formData.getAll("flowId[]"),
    }),
  },
);
