"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { SLUG_MAX_LENGTH } from "@/modules/common/utils/slugify";
import { Prisma } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FLOW_SLUG_TAKEN_ERROR, validateFlowSlug } from "../utils/flowSlug";

const schema = z.object({
  flowId: z.string(),
  slug: z.string().trim().min(1).max(SLUG_MAX_LENGTH),
});

export const restoreFlow = createAuthenticatedAction(
  "restoreFlow",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("career", "manage")))
      return { error: t("Common.forbidden"), requestPayload: formData };

    const flow = await prisma.flow.findUnique({
      where: { id: data.flowId },
      select: { id: true, name: true, deletedAt: true },
    });
    if (!flow?.deletedAt)
      return { error: t("Common.notFound"), requestPayload: formData };

    const slugError = validateFlowSlug(data.slug);
    if (slugError) return { error: slugError, requestPayload: formData };

    /**
     * A deleted flow releases its slug, so the one it had may well be in use
     * again — the manager picks a free one in the restore dialog.
     */
    const takenSlug = await prisma.flow.findFirst({
      where: { slug: data.slug, deletedAt: null },
      select: { id: true },
    });
    if (takenSlug)
      return { error: FLOW_SLUG_TAKEN_ERROR, requestPayload: formData };

    const lastFlow = await prisma.flow.findFirst({
      where: { deletedAt: null },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    try {
      await prisma.flow.update({
        where: { id: flow.id },
        data: {
          deletedAt: null,
          deletedById: null,
          slug: data.slug,
          /** Back at the end of the list rather than into a position that moved on */
          position: (lastFlow?.position ?? 0) + 1,
          updatedById: authentication.session.entity?.id ?? null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return { error: FLOW_SLUG_TAKEN_ERROR, requestPayload: formData };
      throw error;
    }

    await createAuditEvents([
      {
        type: AuditEventType.CAREER_FLOW_RESTORED,
        data: {
          flowId: flow.id,
          name: flow.name,
          slug: data.slug,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/career", "layout");
    revalidatePath(`/app/career/${data.slug}`);

    return {
      success: "Der Karrierebaum wurde wiederhergestellt.",
    };
  },
);
