"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { satisfiesAnyPermissionString } from "@/modules/auth/utils/satisfiesAnyPermissionString";
import { z } from "zod";
import {
  getOnboardingTaskByKey,
  OnboardingStepKey,
  OnboardingTaskKey,
} from "../utils/config";

const schema = z.object({
  taskKey: z.enum(OnboardingTaskKey),
  stepKey: z.enum(OnboardingStepKey),
});

export const completeOnboardingStep = createAuthenticatedAction(
  "completeOnboardingStep",
  schema,
  async (formData, authentication, data, t) => {
    const citizenId = authentication.session.entity?.id;
    if (!citizenId)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const task = getOnboardingTaskByKey(data.taskKey);
    const step = task?.steps.find(
      (stepCandidate) => stepCandidate.key === data.stepKey,
    );
    if (!task || !step)
      return { error: t("Common.notFound"), requestPayload: formData };

    if (
      !(await satisfiesAnyPermissionString(
        authentication,
        task.requiredPermissionStrings,
      )) ||
      !(await satisfiesAnyPermissionString(
        authentication,
        step.requiredPermissionStrings,
      ))
    )
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * A replay updates the timestamp of the existing row, so the progress
     * always reflects the most recent pass through the tour.
     */
    await prisma.onboardingStepProgress.upsert({
      where: {
        citizenId_taskKey_stepKey: {
          citizenId,
          taskKey: data.taskKey,
          stepKey: data.stepKey,
        },
      },
      update: { completedAt: new Date() },
      create: { citizenId, taskKey: data.taskKey, stepKey: data.stepKey },
    });

    return { success: "Fortschritt gespeichert." };
  },
);
