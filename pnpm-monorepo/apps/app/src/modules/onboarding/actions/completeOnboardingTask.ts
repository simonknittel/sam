"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { satisfiesAnyPermissionString } from "@/modules/auth/utils/satisfiesAnyPermissionString";
import { OnboardingTaskCompletionMethod } from "@sam-monorepo/database/client";
import { z } from "zod";
import { getOnboardingTaskByKey, OnboardingTaskKey } from "../utils/config";

const schema = z.object({
  taskKey: z.enum(OnboardingTaskKey),
  completionMethod: z.enum(OnboardingTaskCompletionMethod),
});

export const completeOnboardingTask = createAuthenticatedAction(
  "completeOnboardingTask",
  schema,
  async (formData, authentication, data, t) => {
    const citizenId = authentication.session.entity?.id;
    if (!citizenId)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const task = getOnboardingTaskByKey(data.taskKey);
    if (!task) return { error: t("Common.notFound"), requestPayload: formData };

    if (
      !(await satisfiesAnyPermissionString(
        authentication,
        task.requiredPermissionStrings,
      ))
    )
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * A replay updates the timestamp and the completion method of the
     * existing row, so the progress always reflects the most recent pass.
     */
    await prisma.onboardingTaskProgress.upsert({
      where: { citizenId_taskKey: { citizenId, taskKey: data.taskKey } },
      update: {
        completedAt: new Date(),
        completionMethod: data.completionMethod,
      },
      create: {
        citizenId,
        taskKey: data.taskKey,
        completedAt: new Date(),
        completionMethod: data.completionMethod,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.ONBOARDING_TASK_COMPLETED,
        data: {
          citizenId,
          taskKey: data.taskKey,
          completionMethod: data.completionMethod,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Deliberately no revalidation: the onboarding state is resolved in the
     * `/app` layout, so revalidating would re-render the whole shell
     * underneath the open popover. The onboarding context holds the
     * optimistic state instead.
     */
    return {
      success:
        data.completionMethod === OnboardingTaskCompletionMethod.SKIPPED
          ? "Die Aufgabe wurde als erledigt markiert."
          : "Die Aufgabe wurde abgeschlossen.",
    };
  },
);
