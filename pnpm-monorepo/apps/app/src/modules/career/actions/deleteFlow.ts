"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  flowId: z.string(),
});

export const deleteFlow = createAuthenticatedAction(
  "deleteFlow",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("career", "manage")))
      return { error: t("Common.forbidden"), requestPayload: formData };

    const flow = await prisma.flow.findUnique({
      where: { id: data.flowId },
      select: { id: true, name: true, slug: true, deletedAt: true },
    });
    if (!flow || flow.deletedAt)
      return { error: t("Common.notFound"), requestPayload: formData };

    /**
     * Soft delete only: nodes, edges and role access stay in place, which is
     * what makes a restore possible.
     */
    await prisma.flow.update({
      where: { id: flow.id },
      data: {
        deletedAt: new Date(),
        deletedById: authentication.session.entity?.id ?? null,
        updatedById: authentication.session.entity?.id ?? null,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.CAREER_FLOW_DELETED,
        data: {
          flowId: flow.id,
          name: flow.name,
          slug: flow.slug,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/career", "layout");
    revalidatePath(`/app/career/${flow.slug}`);

    /** The detail page is gone with the flow; the list is where a restore starts */
    redirect("/app/career/settings");
  },
);
