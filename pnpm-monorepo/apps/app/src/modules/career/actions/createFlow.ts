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
  name: z.string().trim().min(1).max(FLOW_NAME_MAX_LENGTH),
  slug: z.string().trim().min(1).max(SLUG_MAX_LENGTH),
});

export const createFlow = createAuthenticatedAction(
  "createFlow",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("career", "manage")))
      return { error: t("Common.forbidden"), requestPayload: formData };

    const slugError = validateFlowSlug(data.slug);
    if (slugError) return { error: slugError, requestPayload: formData };

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

    const citizenId = authentication.session.entity?.id ?? null;

    let flowId: string;
    try {
      const flow = await prisma.flow.create({
        data: {
          name: data.name,
          slug: data.slug,
          position: (lastFlow?.position ?? 0) + 1,
          createdById: citizenId,
          updatedById: citizenId,
        },
        select: { id: true },
      });
      flowId = flow.id;
    } catch (error) {
      /** Two managers creating the same slug at once; the index is the arbiter */
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return { error: FLOW_SLUG_TAKEN_ERROR, requestPayload: formData };
      throw error;
    }

    await createAuditEvents([
      {
        type: AuditEventType.CAREER_FLOW_CREATED,
        data: {
          flowId,
          name: data.name,
          slug: data.slug,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * The navigation lives in the career layout, so every career page has to
     * pick the new flow up.
     */
    revalidatePath("/app/career", "layout");

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
