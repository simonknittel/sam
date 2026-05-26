"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";

const schema = z.object({
  title: z.string().trim().min(1).max(255),
  regExp: z.string().trim().min(1),
  messageTemplate: z.string().trim().min(1),
});

export const createLogAnalyzerPattern = createAuthenticatedAction(
  "createLogAnalyzerPattern",
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

    const pattern = await prisma.logAnalyzerPattern.create({
      data: {
        title: data.title,
        regExp: data.regExp,
        messageTemplate: data.messageTemplate,
        createdBy: {
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
        type: AuditEventType.LOG_ANALYZER_PATTERN_CREATED,
        data: {
          patternId: pattern.id,
          title: pattern.title,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
