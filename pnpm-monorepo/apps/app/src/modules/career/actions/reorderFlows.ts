"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { refresh } from "next/cache";
import * as z from "zod";

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
    if (!isPermutation) {
      /** The page then shows the current list */
      return rejectConflict(
        "Die Reihenfolge war veraltet. Die Liste ist jetzt aktuell, bitte versuche es erneut.",
        formData,
      );
    }

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

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.CAREER_FLOWS_REORDERED,
        data: {
          flowIds: data.flowIds,
        },
        createdById: authentication.session.user.id,
      },
    ]);

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
