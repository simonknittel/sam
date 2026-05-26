"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";

const schema = z.object({
  id: z.cuid2(),
});

export const toggleLogAnalyzerPattern = createAuthenticatedAction(
  "toggleLogAnalyzerPattern",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("logAnalyzerPattern", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const existingPattern = await prisma.logAnalyzerPattern.findFirst({
      where: {
        id: data.id,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        disabledAt: true,
      },
    });
    if (!existingPattern)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    const isCurrentlyDisabled = existingPattern.disabledAt !== null;

    const updatedPattern = await prisma.logAnalyzerPattern.update({
      where: {
        id: data.id,
      },
      data: {
        disabledAt: isCurrentlyDisabled ? null : new Date(),
        disabledBy: isCurrentlyDisabled
          ? undefined
          : {
              connect: {
                id: authentication.session.entity.id,
              },
            },
      },
      select: {
        id: true,
        title: true,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.LOG_ANALYZER_PATTERN_TOGGLED,
        data: {
          patternId: updatedPattern.id,
          title: updatedPattern.title,
          disabled: !isCurrentlyDisabled,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: isCurrentlyDisabled
        ? t("Common.successfullySaved")
        : t("Common.successfullyDeleted"),
    };
  },
);
