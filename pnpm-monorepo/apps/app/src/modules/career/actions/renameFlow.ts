"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { SLUG_MAX_LENGTH } from "@/modules/common/utils/slugify";
import { Prisma } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  FLOW_NAME_MAX_LENGTH,
  FLOW_SLUG_TAKEN_ERROR,
  validateFlowSlug,
} from "../utils/flowSlug";

const schema = z.object({
  flowId: z.string(),
  name: z.string().trim().min(1).max(FLOW_NAME_MAX_LENGTH),
  slug: z.string().trim().min(1).max(SLUG_MAX_LENGTH),
});

export const renameFlow = createAuthenticatedAction(
  "renameFlow",
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

    const slugError = validateFlowSlug(data.slug);
    if (slugError) return { error: slugError, requestPayload: formData };

    const takenSlug = await prisma.flow.findFirst({
      where: { slug: data.slug, deletedAt: null, id: { not: flow.id } },
      select: { id: true },
    });
    if (takenSlug)
      return { error: FLOW_SLUG_TAKEN_ERROR, requestPayload: formData };

    try {
      await prisma.flow.update({
        where: { id: flow.id },
        data: {
          name: data.name,
          slug: data.slug,
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
        type: AuditEventType.CAREER_FLOW_RENAMED,
        data: {
          flowId: flow.id,
          previousName: flow.name,
          name: data.name,
          previousSlug: flow.slug,
          slug: data.slug,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /** The navigation and both the old and the new URL of the flow */
    revalidatePath("/app/career", "layout");
    revalidatePath(`/app/career/${flow.slug}`);
    revalidatePath(`/app/career/${data.slug}`);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
